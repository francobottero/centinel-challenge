import { prisma } from "@/lib/prisma";
import {
  getLatestRelevantUploadSessionId,
  serializeExpenseReport,
  summarizeUploadSession,
} from "@/lib/expense-report-dashboard";

export async function getExpenseReportsDashboardData(
  userId: string,
  preferredUploadSessionId?: string | null,
) {
  const reports = (
    await prisma.expenseReport.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        uploadSessionId: true,
        status: true,
        processingError: true,
        invoiceNumber: true,
        description: true,
        amount: true,
        category: true,
        expenseDate: true,
        vendorName: true,
        additionalNotes: true,
        sourceFileName: true,
        storedFilePath: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  ).map(serializeExpenseReport);

  const activeUploadSessionId = getLatestRelevantUploadSessionId(reports);
  const selectedUploadSessionId =
    preferredUploadSessionId &&
    reports.some((report) => report.uploadSessionId === preferredUploadSessionId)
      ? preferredUploadSessionId
      : activeUploadSessionId;

  return {
    reports,
    activeUploadSessionId,
    selectedUploadSessionId,
    summary: summarizeUploadSession(reports, selectedUploadSessionId),
  };
}
