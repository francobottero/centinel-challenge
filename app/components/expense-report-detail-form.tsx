"use client";

import { useActionState } from "react";

import {
  updateExpenseReport,
  type UpdateExpenseReportActionState,
} from "@/app/actions/expense-reports";
import { Input, Textarea } from "@/app/components/input";

type ExpenseReportDetailFormProps = {
  report: {
    id: string;
    status: string;
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
  };
};

const initialState: UpdateExpenseReportActionState = {};

export function ExpenseReportDetailForm({
  report,
}: ExpenseReportDetailFormProps) {
  const [state, formAction, pending] = useActionState(
    updateExpenseReport,
    initialState,
  );
  const isEditable = report.status === "COMPLETED";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="reportId" value={report.id} />

      {!isEditable ? (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {report.status === "FAILED"
            ? report.processingError ?? "This receipt failed to process."
            : "This receipt is still processing. Fields become editable once extraction finishes."}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="invoiceNumber" className="text-sm font-medium">
            Invoice number
          </label>
          <Input
            id="invoiceNumber"
            value={report.invoiceNumber ?? "Not found"}
            readOnly
            disabled
          />
          <p className="text-xs text-[var(--muted)]">
            Invoice number is locked after extraction.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="vendorName" className="text-sm font-medium">
            Vendor name
          </label>
          <Input
            id="vendorName"
            name="vendorName"
            defaultValue={report.vendorName ?? ""}
            disabled={!isEditable}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <Input
            id="description"
            name="description"
            defaultValue={report.description ?? ""}
            disabled={!isEditable}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium">
            Amount
          </label>
          <Input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            defaultValue={report.amount ?? ""}
            placeholder="123.45"
            disabled={!isEditable}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <Input
            id="category"
            name="category"
            defaultValue={report.category ?? ""}
            disabled={!isEditable}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="expenseDate" className="text-sm font-medium">
            Expense date
          </label>
          <Input
            id="expenseDate"
            name="expenseDate"
            type="date"
            defaultValue={report.expenseDate ?? ""}
            disabled={!isEditable}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="sourceFileName" className="text-sm font-medium">
            Source file
          </label>
          <Input
            id="sourceFileName"
            value={report.sourceFileName}
            readOnly
            disabled
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="additionalNotes" className="text-sm font-medium">
            Additional notes
          </label>
          <Textarea
            id="additionalNotes"
            name="additionalNotes"
            defaultValue={report.additionalNotes ?? ""}
            rows={5}
            disabled={!isEditable}
          />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          {state.success}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[var(--muted)]">
          {report.storedFilePath ? (
            <a
              href={`/receipts/${report.id}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--accent)] underline decoration-transparent transition hover:decoration-current"
            >
              Open original PDF
            </a>
          ) : (
            "Original file unavailable"
          )}
        </div>

        <button
          type="submit"
          disabled={pending || !isEditable}
          className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Saving..." : isEditable ? "Save changes" : "Waiting for extraction"}
        </button>
      </div>
    </form>
  );
}
