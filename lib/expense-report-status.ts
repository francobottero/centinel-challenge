export const expenseReportStatuses = [
  "UPLOADED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

export type ExpenseReportStatusValue = (typeof expenseReportStatuses)[number];

export const expenseReportStatusLabels: Record<ExpenseReportStatusValue, string> = {
  UPLOADED: "Queued",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function isPendingExpenseReportStatus(status: ExpenseReportStatusValue) {
  return status === "UPLOADED" || status === "PROCESSING";
}
