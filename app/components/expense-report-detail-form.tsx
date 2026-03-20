"use client";

import { useActionState } from "react";

import {
  updateExpenseReport,
  type UpdateExpenseReportActionState,
} from "@/app/actions/expense-reports";

type ExpenseReportDetailFormProps = {
  report: {
    id: string;
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

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="reportId" value={report.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="invoiceNumber" className="text-sm font-medium">
            Invoice number
          </label>
          <input
            id="invoiceNumber"
            value={report.invoiceNumber ?? "Not found"}
            readOnly
            disabled
            className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 px-4 py-3 text-sm text-[var(--muted)]"
          />
          <p className="text-xs text-[var(--muted)]">
            Invoice number is locked after extraction.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="vendorName" className="text-sm font-medium">
            Vendor name
          </label>
          <input
            id="vendorName"
            name="vendorName"
            defaultValue={report.vendorName ?? ""}
            className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 px-4 py-3 text-sm"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <input
            id="description"
            name="description"
            defaultValue={report.description ?? ""}
            className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 px-4 py-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium">
            Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            defaultValue={report.amount ?? ""}
            placeholder="123.45"
            className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 px-4 py-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <input
            id="category"
            name="category"
            defaultValue={report.category ?? ""}
            className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 px-4 py-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="expenseDate" className="text-sm font-medium">
            Expense date
          </label>
          <input
            id="expenseDate"
            name="expenseDate"
            type="date"
            defaultValue={report.expenseDate ?? ""}
            className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 px-4 py-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="sourceFileName" className="text-sm font-medium">
            Source file
          </label>
          <input
            id="sourceFileName"
            value={report.sourceFileName}
            readOnly
            disabled
            className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 px-4 py-3 text-sm text-[var(--muted)]"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="additionalNotes" className="text-sm font-medium">
            Additional notes
          </label>
          <textarea
            id="additionalNotes"
            name="additionalNotes"
            defaultValue={report.additionalNotes ?? ""}
            rows={5}
            className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 px-4 py-3 text-sm"
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
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
