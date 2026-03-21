import type { ExpenseReport } from "@prisma/client";

import {
  isPendingExpenseReportStatus,
  type ExpenseReportStatusValue,
} from "@/lib/expense-report-status";

type ExpenseReportDashboardRecord = Pick<
  ExpenseReport,
  | "id"
  | "uploadSessionId"
  | "status"
  | "processingError"
  | "invoiceNumber"
  | "description"
  | "amount"
  | "category"
  | "expenseDate"
  | "vendorName"
  | "additionalNotes"
  | "sourceFileName"
  | "storedFilePath"
  | "createdAt"
  | "updatedAt"
>;

export type ExpenseReportListItem = {
  id: string;
  uploadSessionId: string | null;
  status: ExpenseReportStatusValue;
  processingError: string | null;
  invoiceNumber: string | null;
  description: string | null;
  amount: string | null;
  category: string | null;
  expenseDate: string | null;
  vendorName: string | null;
  additionalNotes: string | null;
  sourceFileName: string;
  storedFilePath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UploadSessionSummary = {
  uploadSessionId: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  processingFiles: number;
  queuedFiles: number;
  progressPercentage: number;
  isFinished: boolean;
};

export function serializeExpenseReport(
  report: ExpenseReportDashboardRecord,
): ExpenseReportListItem {
  return {
    id: report.id,
    uploadSessionId: report.uploadSessionId,
    status: report.status,
    processingError: report.processingError,
    invoiceNumber: report.invoiceNumber,
    description: report.description,
    amount: report.amount?.toString() ?? null,
    category: report.category,
    expenseDate: report.expenseDate
      ? report.expenseDate.toISOString().slice(0, 10)
      : null,
    vendorName: report.vendorName,
    additionalNotes: report.additionalNotes,
    sourceFileName: report.sourceFileName,
    storedFilePath: report.storedFilePath,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function summarizeUploadSession(
  reports: ExpenseReportListItem[],
  uploadSessionId: string | null,
): UploadSessionSummary | null {
  if (!uploadSessionId) {
    return null;
  }

  const sessionReports = reports.filter(
    (report) => report.uploadSessionId === uploadSessionId,
  );

  if (sessionReports.length === 0) {
    return null;
  }

  const completedFiles = sessionReports.filter(
    (report) => report.status === "COMPLETED",
  ).length;
  const failedFiles = sessionReports.filter(
    (report) => report.status === "FAILED",
  ).length;
  const processingFiles = sessionReports.filter(
    (report) => report.status === "PROCESSING",
  ).length;
  const queuedFiles = sessionReports.filter(
    (report) => report.status === "UPLOADED",
  ).length;
  const totalFiles = sessionReports.length;
  const resolvedFiles = completedFiles + failedFiles;

  return {
    uploadSessionId,
    totalFiles,
    completedFiles,
    failedFiles,
    processingFiles,
    queuedFiles,
    progressPercentage:
      totalFiles > 0 ? Math.round((resolvedFiles / totalFiles) * 100) : 0,
    isFinished: sessionReports.every(
      (report) => !isPendingExpenseReportStatus(report.status),
    ),
  };
}

export function getLatestRelevantUploadSessionId(
  reports: ExpenseReportListItem[],
) {
  const activeReport = reports.find(
    (report) =>
      Boolean(report.uploadSessionId) && isPendingExpenseReportStatus(report.status),
  );

  if (activeReport?.uploadSessionId) {
    return activeReport.uploadSessionId;
  }

  return reports.find((report) => Boolean(report.uploadSessionId))?.uploadSessionId ?? null;
}
