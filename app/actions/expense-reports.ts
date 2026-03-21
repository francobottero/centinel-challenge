"use server";

import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { enqueueExpenseReportProcessing } from "@/lib/expense-report-queue";
import { validateReceiptFile } from "@/lib/expense-reports";
import { prisma } from "@/lib/prisma";
import { saveReceiptFile } from "@/lib/receipt-storage";

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

const amountPattern = /^\d+(\.\d{1,2})?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function normalizeOptionalTextEntry(entry: FormDataEntryValue | null) {
  if (typeof entry !== "string") {
    return null;
  }

  const value = entry.trim();
  return value.length > 0 ? value : null;
}

export async function createExpenseReport(
  _prevState: ExpenseReportActionState,
  formData: FormData,
): Promise<ExpenseReportActionState> {
  const session = await getSession();

  if (!session?.user?.id) {
    return {
      error: "You need to be signed in to upload a receipt.",
    };
  }

  const fileEntries = formData.getAll("receipt");
  const files = fileEntries.filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return {
      error: "Please choose at least one receipt or invoice file to upload.",
    };
  }

  const uploadSessionId = randomUUID();

  try {
    const failures: string[] = [];
    let queuedCount = 0;

    for (const fileEntry of files) {
      try {
        validateReceiptFile(fileEntry);

        const storedFile = await saveReceiptFile(fileEntry);
        const createdReport = await prisma.expenseReport.create({
          data: {
            userId: session.user.id,
            uploadSessionId,
            sourceFileName: fileEntry.name || "uploaded-document",
            storedFileName: storedFile.storedFileName,
            storedFilePath: storedFile.storedFilePath,
            fileMimeType: storedFile.fileMimeType,
            fileSizeBytes: storedFile.fileSizeBytes,
          },
          select: {
            id: true,
          },
        });

        try {
          await enqueueExpenseReportProcessing(createdReport.id);
          queuedCount += 1;
        } catch (error) {
          await prisma.expenseReport.update({
            where: {
              id: createdReport.id,
            },
            data: {
              status: "FAILED",
              processingError:
                error instanceof Error
                  ? error.message
                  : "We could not queue that receipt for processing.",
            },
          });

          failures.push(
            `${fileEntry.name}: ${
              error instanceof Error
                ? error.message
                : "we could not queue that receipt for processing."
            }`,
          );
        }
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          failures.push(
            `${fileEntry.name}: this invoice number was already processed.`,
          );
          continue;
        }

        failures.push(
          `${fileEntry.name}: ${
            error instanceof Error
              ? error.message
              : "we could not save that extracted document."
          }`,
        );
      }
    }

    revalidatePath("/");

    if (queuedCount === 0) {
      return {
        error: failures.join(" "),
        uploadSessionId,
        queuedCount,
      };
    }

    if (failures.length > 0) {
      return {
        success: `Queued ${queuedCount} of ${files.length} receipt${files.length === 1 ? "" : "s"} for background processing.`,
        error: failures.join(" "),
        uploadSessionId,
        queuedCount,
      };
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We could not queue those documents for processing.",
    };
  }

  return {
    success: `Queued ${files.length} receipt${files.length === 1 ? "" : "s"} for background processing.`,
    uploadSessionId,
    queuedCount: files.length,
  };
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

  const existingReport = await prisma.expenseReport.findFirst({
    where: {
      id: reportId,
      userId: session.user.id,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existingReport) {
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
    await prisma.expenseReport.update({
      where: {
        id: existingReport.id,
      },
      data: {
        description,
        amount: amount ? new Prisma.Decimal(amount) : null,
        category,
        expenseDate: expenseDate
          ? new Date(`${expenseDate}T00:00:00.000Z`)
          : null,
        vendorName,
        additionalNotes,
      },
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
  revalidatePath(`/expense-reports/${existingReport.id}`);

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

  const existingReport = await prisma.expenseReport.findFirst({
    where: {
      id: reportId,
      userId: session.user.id,
    },
    select: {
      id: true,
      status: true,
      storedFilePath: true,
    },
  });

  if (!existingReport) {
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
    await prisma.expenseReport.delete({
      where: {
        id: existingReport.id,
      },
    });

    if (existingReport.storedFilePath) {
      await unlink(existingReport.storedFilePath).catch(() => undefined);
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
