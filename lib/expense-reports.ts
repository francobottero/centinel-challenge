import { z } from "zod";

import {
  batchExpenseExtractionSchema,
  type BatchExtractedExpenseReport,
  type ExtractedExpenseReport,
} from "@/lib/expense-report-schema";
import { acceptedReceiptMimeTypes } from "@/lib/receipt-file-types";
import { gemini } from "@/lib/gemini";

const allowedTypes = new Set<string>(acceptedReceiptMimeTypes);

const amountSchema = z.string().regex(/^\d+(\.\d{1,2})?$/);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function validateReceiptFile(file: File) {
  if (file.size === 0) {
    throw new Error("Please choose a receipt or invoice file to upload.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Please upload a file smaller than 10 MB.");
  }

  if (file.type && !allowedTypes.has(file.type)) {
    throw new Error("Supported file types are PDF, JPG, PNG, and WEBP.");
  }
}

export async function extractExpenseReportFromFile(
  file: File,
): Promise<ExtractedExpenseReport> {
  const [extracted] = await extractExpenseReportsFromFiles([file]);

  return extracted;
}

export async function extractExpenseReportsFromFiles(
  files: File[],
): Promise<BatchExtractedExpenseReport[]> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from your environment.");
  }

  if (files.length === 0) {
    throw new Error("Please choose at least one receipt or invoice file.");
  }

  for (const file of files) {
    validateReceiptFile(file);
  }

  const model = process.env.GEMINI_RECEIPT_MODEL ?? "gemini-2.5-flash";
  const contents: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [
    {
      text:
        "You can receive multiple uploaded invoice or receipt files. " +
        "Each file can be a PDF or an image. Treat each file as a separate document and extract data for each one independently. " +
        "Return JSON only as an array with exactly one object per uploaded document, in the same order as the documents are provided. " +
        "Each object must have these keys: documentIndex, sourceFileName, invoiceNumber, description, amount, category, expenseDate, vendorName, additionalNotes. " +
        "documentIndex must be the zero-based index of the document in input order. " +
        "sourceFileName must exactly match the provided file name for that document. " +
        "Use null when a field is missing or unclear. Normalize dates to YYYY-MM-DD and amounts to decimal strings without currency symbols. " +
        "Try to infer the category based on the description and vendor name. For example, if the description mentions 'Uber' or 'Lyft', categorize it as 'Transportation'. If it mentions 'Starbucks' or 'Cafe', categorize it as 'Meals'. If it mentions 'Amazon' or 'Office Supplies', categorize it as 'Office Supplies'. If the category is unclear, return null.",
    },
  ];

  for (const [index, file] of files.entries()) {
    const buffer = Buffer.from(await file.arrayBuffer());

    contents.push({
      text: `Document ${index} file name: ${file.name || `document-${index + 1}.pdf`}`,
    });
    contents.push({
      inlineData: {
        mimeType: file.type || "application/pdf",
        data: buffer.toString("base64"),
      },
    });
  }

  const response = await gemini.models.generateContent({
    model,
    contents,
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

  if (parsed.length !== files.length) {
    throw new Error(
      "The model returned an unexpected number of extracted documents.",
    );
  }

  return parsed.map((entry, index) => {
    if (entry.documentIndex !== index) {
      throw new Error(
        "The model returned extracted documents out of order or with invalid indexes.",
      );
    }

    return {
      ...entry,
      sourceFileName:
        entry.sourceFileName ||
        files[index]?.name ||
        `document-${index + 1}.pdf`,
      amount:
        entry.amount && amountSchema.safeParse(entry.amount).success
          ? entry.amount
          : null,
      expenseDate:
        entry.expenseDate && isoDateSchema.safeParse(entry.expenseDate).success
          ? entry.expenseDate
          : null,
    };
  });
}
