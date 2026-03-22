"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { getFirebaseAdminDb, getFirebaseAdminStorage } from "@/lib/firebase-admin";
import {
  expenseReportsCollectionName,
  type ExpenseReportFirestoreDocument,
} from "@/lib/firebase-expense-reports";

export type ExpenseReportActionState = {
  error?: string;
  success?: string;
  uploadSessionId?: string;
  queuedCount?: number;
};

export type UpdateExpenseReportActionState = {
  error?: string;
  success?: string;
};

export type DeleteExpenseReportActionState = {
  error?: string;
  success?: string;
};

export type RetryExpenseReportActionState = {
  error?: string;
  success?: string;
};

const amountPattern = /^\d+(\.\d{1,2})?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function normalizeOptionalTextEntry(entry: FormDataEntryValue | null) {
  if (typeof entry !== "string") {
    return null;
  }

  const value = entry.trim();
  return value.length > 0 ? value : null;
}

export async function updateExpenseReport(
  _prevState: UpdateExpenseReportActionState,
  formData: FormData,
): Promise<UpdateExpenseReportActionState> {
  const session = await getSession();

  if (!session?.user?.id) {
    return {
      error: "You need to be signed in to update an expense report.",
    };
  }

  const reportId = formData.get("reportId");

  if (typeof reportId !== "string" || reportId.trim().length === 0) {
    return {
      error: "Expense report ID is missing.",
    };
  }

  const reportReference = getFirebaseAdminDb()
    .collection(expenseReportsCollectionName)
    .doc(reportId);
  const reportSnapshot = await reportReference.get();

  if (!reportSnapshot.exists) {
    return {
      error: "Expense report not found.",
    };
  }

  const existingReport = reportSnapshot.data() as ExpenseReportFirestoreDocument;

  if (existingReport.userId !== session.user.id) {
    return {
      error: "Expense report not found.",
    };
  }

  if (existingReport.status !== "COMPLETED") {
    return {
      error:
        existingReport.status === "FAILED"
          ? "Failed reports cannot be edited until they are reprocessed."
          : "This expense report is still processing and is not editable yet.",
    };
  }

  const description = normalizeOptionalTextEntry(formData.get("description"));
  const amount = normalizeOptionalTextEntry(formData.get("amount"));
  const category = normalizeOptionalTextEntry(formData.get("category"));
  const expenseDate = normalizeOptionalTextEntry(formData.get("expenseDate"));
  const vendorName = normalizeOptionalTextEntry(formData.get("vendorName"));
  const additionalNotes = normalizeOptionalTextEntry(
    formData.get("additionalNotes"),
  );

  if (amount && !amountPattern.test(amount)) {
    return {
      error: "Amount must be a valid decimal number with up to 2 decimal places.",
    };
  }

  if (expenseDate && !datePattern.test(expenseDate)) {
    return {
      error: "Expense date must use the YYYY-MM-DD format.",
    };
  }

  try {
    await reportReference.update({
      description,
      amount,
      category,
      expenseDate,
      vendorName,
      additionalNotes,
      updatedAt: new Date(),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We could not update that expense report.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/expense-reports/${reportId}`);

  return {
    success: "Expense report updated.",
  };
}

export async function deleteFailedExpenseReport(
  reportId: string,
): Promise<DeleteExpenseReportActionState> {
  const session = await getSession();

  if (!session?.user?.id) {
    return {
      error: "You need to be signed in to delete an expense report.",
    };
  }

  const reportReference = getFirebaseAdminDb()
    .collection(expenseReportsCollectionName)
    .doc(reportId);
  const reportSnapshot = await reportReference.get();

  if (!reportSnapshot.exists) {
    return {
      error: "Expense report not found.",
    };
  }

  const existingReport = reportSnapshot.data() as ExpenseReportFirestoreDocument;

  if (existingReport.userId !== session.user.id) {
    return {
      error: "Expense report not found.",
    };
  }

  if (existingReport.status !== "FAILED") {
    return {
      error: "Only failed expense reports can be deleted.",
    };
  }

  try {
    await reportReference.delete();

    if (existingReport.storagePath) {
      await getFirebaseAdminStorage()
        .bucket()
        .file(existingReport.storagePath)
        .delete()
        .catch(() => undefined);
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We could not delete that expense report.",
    };
  }

  revalidatePath("/");

  return {
    success: "Failed expense report deleted.",
  };
}

export async function retryExpenseReportProcessing(
  reportId: string,
): Promise<RetryExpenseReportActionState> {
  const session = await getSession();

  if (!session?.user?.id) {
    return {
      error: "You need to be signed in to retry an expense report.",
    };
  }

  const reportReference = getFirebaseAdminDb()
    .collection(expenseReportsCollectionName)
    .doc(reportId);
  const reportSnapshot = await reportReference.get();

  if (!reportSnapshot.exists) {
    return {
      error: "Expense report not found.",
    };
  }

  const existingReport = reportSnapshot.data() as ExpenseReportFirestoreDocument;

  if (existingReport.userId !== session.user.id) {
    return {
      error: "Expense report not found.",
    };
  }

  if (existingReport.status === "PROCESSING") {
    return {
      error: "This expense report is already processing.",
    };
  }

  if (existingReport.status === "COMPLETED") {
    return {
      error: "Completed expense reports do not need to be retried.",
    };
  }

  try {
    await reportReference.update({
      status: "UPLOADED",
      retryRequestedAt: new Date(),
      processingError: null,
      processingStartedAt: null,
      processedAt: null,
      updatedAt: new Date(),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We could not retry that expense report.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/expense-reports/${reportId}`);

  return {
    success: "Expense report re-queued for processing.",
  };
}
