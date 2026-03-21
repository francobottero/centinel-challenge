import {
  expenseReportStatusLabels,
  type ExpenseReportStatusValue,
} from "@/lib/expense-report-status";

const statusClassNames: Record<ExpenseReportStatusValue, string> = {
  UPLOADED: "border-slate-300 bg-slate-100 text-slate-700",
  PROCESSING: "border-amber-300 bg-amber-100 text-amber-700",
  COMPLETED: "border-emerald-300 bg-emerald-100 text-emerald-700",
  FAILED: "border-red-300 bg-red-100 text-red-700",
};

type ExpenseReportStatusBadgeProps = {
  status: ExpenseReportStatusValue;
};

export function ExpenseReportStatusBadge({
  status,
}: ExpenseReportStatusBadgeProps) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] " +
        statusClassNames[status]
      }
    >
      {expenseReportStatusLabels[status]}
    </span>
  );
}
