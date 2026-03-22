import type {
  ExpenseReportListItem,
  UploadSessionSummary,
} from "@/lib/expense-report-dashboard";
import {
  getLatestRelevantUploadSessionId,
  summarizeUploadSession,
} from "@/lib/expense-report-dashboard";
import type { ExpenseReportStatusValue } from "@/lib/expense-report-status";

export const expenseReportsCollectionName = "expenseReports";

export type ExpenseReportFirestoreDocument = {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  uploadSessionId: string | null;
  status: ExpenseReportStatusValue;
  fileHash?: string | null;
  retryRequestedAt?: unknown;
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
  createdAt: unknown;
  updatedAt: unknown;
  processingStartedAt: unknown;
  processedAt: unknown;
};

export type ExpenseReportStreamSnapshot = {
  reports: ExpenseReportListItem[];
  activeUploadSessionId: string | null;
  selectedUploadSessionId: string | null;
  summary: UploadSessionSummary | null;
};

export type ExpenseReportStreamPayload = ExpenseReportStreamSnapshot;

type ExpenseReportFirestoreDataShape = Partial<ExpenseReportFirestoreDocument>;

export function createExpenseReportSnapshot(
  reports: ExpenseReportListItem[],
  preferredUploadSessionId?: string | null,
): ExpenseReportStreamSnapshot {
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

export function serializeExpenseReportData(
  id: string,
  data: ExpenseReportFirestoreDataShape,
): ExpenseReportListItem {
  return {
    id,
    uploadSessionId: data.uploadSessionId ?? null,
    status: (data.status ?? "UPLOADED") as ExpenseReportStatusValue,
    processingError: data.processingError ?? null,
    invoiceNumber: data.invoiceNumber ?? null,
    description: data.description ?? null,
    amount: data.amount ?? null,
    category: data.category ?? null,
    expenseDate: data.expenseDate ?? null,
    vendorName: data.vendorName ?? null,
    additionalNotes: data.additionalNotes ?? null,
    sourceFileName: data.sourceFileName ?? "uploaded-document",
    storedFilePath: data.storagePath ?? null,
    createdAt: serializeTimestampLike(data.createdAt),
    updatedAt: serializeTimestampLike(data.updatedAt),
  };
}

export function serializeExpenseReportDoc(document: {
  id: string;
  data: () => ExpenseReportFirestoreDataShape;
}) {
  return serializeExpenseReportData(document.id, document.data());
}

function serializeTimestampLike(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date().toISOString();
}
