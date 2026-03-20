"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { extractExpenseReportsFromFiles } from "@/lib/expense-reports";
import { prisma } from "@/lib/prisma";
import { saveReceiptFile } from "@/lib/receipt-storage";

export type ExpenseReportActionState = {
  error?: string;
  success?: string;
};

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

  try {
    const extractedReports = await extractExpenseReportsFromFiles(files);
    const failures: string[] = [];
    let processedCount = 0;

    for (const [index, fileEntry] of files.entries()) {
      const extracted = extractedReports[index];

      try {
        if (extracted.invoiceNumber) {
          const existingReport = await prisma.expenseReport.findFirst({
            where: {
              userId: session.user.id,
              invoiceNumber: extracted.invoiceNumber,
            },
            select: {
              id: true,
            },
          });

          if (existingReport) {
            failures.push(
              `${fileEntry.name}: invoice ${extracted.invoiceNumber} was already processed.`,
            );
            continue;
          }
        }

        const storedFile = await saveReceiptFile(fileEntry);

        await prisma.expenseReport.create({
          data: {
            userId: session.user.id,
            invoiceNumber: extracted.invoiceNumber,
            description: extracted.description,
            amount: extracted.amount
              ? new Prisma.Decimal(extracted.amount)
              : null,
            category: extracted.category,
            expenseDate: extracted.expenseDate
              ? new Date(`${extracted.expenseDate}T00:00:00.000Z`)
              : null,
            vendorName: extracted.vendorName,
            additionalNotes: extracted.additionalNotes,
            sourceFileName: fileEntry.name || extracted.sourceFileName,
            storedFileName: storedFile.storedFileName,
            storedFilePath: storedFile.storedFilePath,
            fileMimeType: storedFile.fileMimeType,
            fileSizeBytes: storedFile.fileSizeBytes,
          },
        });

        processedCount += 1;
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

    if (processedCount === 0) {
      return {
        error: failures.join(" "),
      };
    }

    if (failures.length > 0) {
      return {
        success: `Processed ${processedCount} of ${files.length} uploaded receipts.`,
        error: failures.join(" "),
      };
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We could not extract data from that document.",
    };
  }

  return {
    success: `Processed and saved ${files.length} receipt${files.length === 1 ? "" : "s"}.`,
  };
}
