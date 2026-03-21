import { readFile } from "node:fs/promises";

import { ExpenseReportStatus, Prisma } from "@prisma/client";

import { extractExpenseReportFromFile } from "@/lib/expense-reports";
import { prisma } from "@/lib/prisma";

export async function processExpenseReport(reportId: string) {
  const report = await prisma.expenseReport.findUnique({
    where: {
      id: reportId,
    },
    select: {
      id: true,
      userId: true,
      status: true,
      sourceFileName: true,
      storedFilePath: true,
      fileMimeType: true,
    },
  });

  if (!report) {
    throw new Error(`Expense report ${reportId} was not found.`);
  }

  if (report.status === ExpenseReportStatus.COMPLETED) {
    return report;
  }

  await prisma.expenseReport.update({
    where: {
      id: report.id,
    },
    data: {
      status: ExpenseReportStatus.PROCESSING,
      processingError: null,
      processingStartedAt: new Date(),
    },
  });

  if (!report.storedFilePath) {
    await markExpenseReportFailed(report.id, "Stored file path is missing.");
    return null;
  }

  try {
    const fileBuffer = await readFile(report.storedFilePath);
    const file = new File([fileBuffer], report.sourceFileName, {
      type: report.fileMimeType || "application/pdf",
    });
    const extracted = await extractExpenseReportFromFile(file);

    if (extracted.invoiceNumber) {
      const existingReport = await prisma.expenseReport.findFirst({
        where: {
          id: {
            not: report.id,
          },
          userId: report.userId,
          invoiceNumber: extracted.invoiceNumber,
          status: {
            not: ExpenseReportStatus.FAILED,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingReport) {
        await markExpenseReportFailed(
          report.id,
          `Invoice ${extracted.invoiceNumber} was already processed.`,
        );
        return null;
      }
    }

    await prisma.expenseReport.update({
      where: {
        id: report.id,
      },
      data: {
        status: ExpenseReportStatus.COMPLETED,
        processingError: null,
        processedAt: new Date(),
        invoiceNumber: extracted.invoiceNumber,
        description: extracted.description,
        amount: extracted.amount ? new Prisma.Decimal(extracted.amount) : null,
        category: extracted.category,
        expenseDate: extracted.expenseDate
          ? new Date(`${extracted.expenseDate}T00:00:00.000Z`)
          : null,
        vendorName: extracted.vendorName,
        additionalNotes: extracted.additionalNotes,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      await markExpenseReportFailed(
        report.id,
        "This invoice number was already processed.",
      );
      return null;
    }

    await markExpenseReportFailed(
      report.id,
      formatExpenseProcessingError(error),
    );
  }

  return prisma.expenseReport.findUnique({
    where: {
      id: report.id,
    },
  });
}

async function markExpenseReportFailed(reportId: string, message: string) {
  await prisma.expenseReport.update({
    where: {
      id: reportId,
    },
    data: {
      status: ExpenseReportStatus.FAILED,
      processingError: message,
      processedAt: null,
    },
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
