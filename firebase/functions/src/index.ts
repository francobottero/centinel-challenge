import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { z } from "zod";

initializeApp();

const db = getFirestore();
const storage = getStorage();
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const expenseReportsCollectionName = "expenseReports";
const acceptedReceiptMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const amountSchema = z.string().regex(/^\d+(\.\d{1,2})?$/);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const batchExpenseExtractionSchema = z.array(
  z.object({
    documentIndex: z.number().int().nonnegative(),
    sourceFileName: z.string(),
    invoiceNumber: z.string().nullable(),
    description: z.string().nullable(),
    amount: z.string().nullable(),
    category: z.string().nullable(),
    expenseDate: z.string().nullable(),
    vendorName: z.string().nullable(),
    additionalNotes: z.string().nullable(),
  }),
);

type ExpenseReportFirestoreDocument = {
  userId: string;
  uploadSessionId: string | null;
  status: "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED";
  retryRequestedAt?: FirebaseFirestore.Timestamp | null;
  processingError: string | null;
  invoiceNumber: string | null;
  description: string | null;
  amount: string | null;
  category: string | null;
  expenseDate: string | null;
  vendorName: string | null;
  additionalNotes: string | null;
  sourceFileName: string;
  storagePath: string | null;
  fileMimeType: string | null;
  fileSizeBytes: number | null;
};

export const processExpenseReportOnCreate = onDocumentCreated(
  {
    document: `${expenseReportsCollectionName}/{reportId}`,
    region: process.env.EXPENSE_REPORTS_FUNCTION_REGION || "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    const reportSnapshot = event.data;

    if (!reportSnapshot?.exists) {
      return;
    }

    await processExpenseReportDocument(
      reportSnapshot.id,
      reportSnapshot.data() as ExpenseReportFirestoreDocument,
    );
  },
);

export const processExpenseReportOnRetry = onDocumentUpdated(
  {
    document: `${expenseReportsCollectionName}/{reportId}`,
    region: process.env.EXPENSE_REPORTS_FUNCTION_REGION || "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    if (!event.data) {
      return;
    }

    const before = event.data.before.data() as ExpenseReportFirestoreDocument | undefined;
    const after = event.data.after.data() as ExpenseReportFirestoreDocument | undefined;

    if (!after) {
      return;
    }

    const beforeRetryRequestedAt = before?.retryRequestedAt?.toMillis?.() ?? null;
    const afterRetryRequestedAt = after.retryRequestedAt?.toMillis?.() ?? null;

    if (afterRetryRequestedAt === null || afterRetryRequestedAt === beforeRetryRequestedAt) {
      return;
    }

    await processExpenseReportDocument(event.data.after.id, after);
  },
);

async function processExpenseReportDocument(
  reportId: string,
  report: ExpenseReportFirestoreDocument,
) {
  if (report.status !== "UPLOADED") {
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    logger.error("GEMINI_API_KEY is missing in Firebase Functions environment.");
    await markExpenseReportFailed(reportId, "The extraction service is not configured.");
    return;
  }

  if (!report.storagePath) {
    await markExpenseReportFailed(reportId, "Stored file path is missing.");
    return;
  }

  try {
    await db.collection(expenseReportsCollectionName).doc(reportId).update({
      status: "PROCESSING",
      processingError: null,
      processingStartedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const [fileBuffer] = await storage.bucket().file(report.storagePath).download();
    const extracted = await extractExpenseReportFromStoredFile({
      buffer: fileBuffer,
      fileName: report.sourceFileName,
      mimeType: report.fileMimeType || "application/pdf",
    });

    if (await isDuplicateExpenseReport(reportId, report.userId, extracted.invoiceNumber)) {
      await deleteDuplicateExpenseReport(reportId, report.storagePath);
      return;
    }

    await db.collection(expenseReportsCollectionName).doc(reportId).update({
      status: "COMPLETED",
      processingError: null,
      processedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      invoiceNumber: extracted.invoiceNumber,
      description: extracted.description,
      amount: extracted.amount,
      category: extracted.category,
      expenseDate: extracted.expenseDate,
      vendorName: extracted.vendorName,
      additionalNotes: extracted.additionalNotes,
    });
  } catch (error) {
    logger.error("Expense report processing failed.", { reportId, error });
    await markExpenseReportFailed(reportId, formatExpenseProcessingError(error));
  }
}

async function isDuplicateExpenseReport(
  reportId: string,
  userId: string,
  invoiceNumber: string | null,
) {
  if (!invoiceNumber) {
    return false;
  }

  const snapshot = await db
    .collection(expenseReportsCollectionName)
    .where("userId", "==", userId)
    .where("invoiceNumber", "==", invoiceNumber)
    .get();

  return snapshot.docs.some((document) => {
    if (document.id === reportId) {
      return false;
    }

    const existingReport = document.data() as ExpenseReportFirestoreDocument;
    return existingReport.status === "COMPLETED";
  });
}

async function deleteDuplicateExpenseReport(
  reportId: string,
  storagePath: string | null,
) {
  if (storagePath) {
    await storage
      .bucket()
      .file(storagePath)
      .delete()
      .catch((error) => {
        logger.error("Could not delete duplicate expense report file.", {
          reportId,
          storagePath,
          error,
        });
      });
  }

  await db.collection(expenseReportsCollectionName).doc(reportId).delete();
}

async function extractExpenseReportFromStoredFile(options: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}) {
  validateStoredFile(options);

  const model = process.env.GEMINI_RECEIPT_MODEL ?? "gemini-2.5-flash";
  const response = await gemini.models.generateContent({
    model,
    contents: [
      {
        text:
          "You will receive one uploaded invoice or receipt file. " +
          "The file can be a PDF or an image. Extract the document into JSON only as an array with exactly one object. " +
          "The object must have these keys: documentIndex, sourceFileName, invoiceNumber, description, amount, category, expenseDate, vendorName, additionalNotes. " +
          "documentIndex must be 0. sourceFileName must exactly match the provided file name. " +
          "Use null when a field is missing or unclear. Normalize dates to YYYY-MM-DD and amounts to decimal strings without currency symbols. " +
          "Try to infer the category based on the description and vendor name. If the category is unclear, return null.",
      },
      {
        text: `Document 0 file name: ${options.fileName}`,
      },
      {
        inlineData: {
          mimeType: options.mimeType,
          data: options.buffer.toString("base64"),
        },
      },
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const responseText = response.text;

  if (!responseText) {
    throw new Error("The model could not extract structured expense data.");
  }

  const parsed = batchExpenseExtractionSchema.parse(JSON.parse(responseText));
  const [firstResult] = parsed;

  if (!firstResult || firstResult.documentIndex !== 0) {
    throw new Error("The model returned an invalid extraction payload.");
  }

  return {
    invoiceNumber: firstResult.invoiceNumber,
    description: firstResult.description,
    amount:
      firstResult.amount && amountSchema.safeParse(firstResult.amount).success
        ? firstResult.amount
        : null,
    category: firstResult.category,
    expenseDate:
      firstResult.expenseDate && isoDateSchema.safeParse(firstResult.expenseDate).success
        ? firstResult.expenseDate
        : null,
    vendorName: firstResult.vendorName,
    additionalNotes: firstResult.additionalNotes,
  };
}

function validateStoredFile(options: { buffer: Buffer; mimeType: string }) {
  if (options.buffer.byteLength === 0) {
    throw new Error("Please choose a receipt or invoice file to upload.");
  }

  if (options.buffer.byteLength > 10 * 1024 * 1024) {
    throw new Error("Please upload a file smaller than 10 MB.");
  }

  if (options.mimeType && !acceptedReceiptMimeTypes.has(options.mimeType)) {
    throw new Error("Supported file types are PDF, JPG, PNG, and WEBP.");
  }
}

async function markExpenseReportFailed(reportId: string, message: string) {
  await db.collection(expenseReportsCollectionName).doc(reportId).update({
    status: "FAILED",
    processingError: message,
    processedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function formatExpenseProcessingError(error: unknown) {
  if (!(error instanceof Error)) {
    return "We could not extract data from that document.";
  }

  const normalizedMessage = extractReadableGeminiMessage(error.message);
  return normalizedMessage ?? error.message;
}

function extractReadableGeminiMessage(rawMessage: string) {
  try {
    const parsed = JSON.parse(rawMessage) as {
      error?: {
        message?: string;
      };
    };

    if (parsed.error?.message) {
      return parsed.error.message.replace(/\s+/g, " ").trim();
    }
  } catch {
    return null;
  }

  return null;
}
