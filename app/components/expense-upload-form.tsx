"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  createExpenseReport,
  type ExpenseReportActionState,
} from "@/app/actions/expense-reports";
import { acceptedReceiptFileInputValue } from "@/lib/receipt-file-types";

const initialState: ExpenseReportActionState = {};
const feedbackTimeoutMs = 5000;

type ExpenseUploadFormProps = {
  onUploadQueued?: (uploadSessionId: string) => void;
};

export function ExpenseUploadForm({ onUploadQueued }: ExpenseUploadFormProps) {
  const [state, formAction, pending] = useActionState(
    createExpenseReport,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [submissionId, setSubmissionId] = useState(0);
  const [dismissedErrorSubmissionId, setDismissedErrorSubmissionId] = useState<
    number | null
  >(null);
  const [dismissedSuccessSubmissionId, setDismissedSuccessSubmissionId] =
    useState<number | null>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  useEffect(() => {
    if (state.uploadSessionId) {
      onUploadQueued?.(state.uploadSessionId);
    }
  }, [onUploadQueued, state.uploadSessionId]);

  useEffect(() => {
    if (!state.error && !state.success) {
      return;
    }

    const currentSubmissionId = submissionId;
    const timeoutId = window.setTimeout(() => {
      if (state.error) {
        setDismissedErrorSubmissionId(currentSubmissionId);
      }

      if (state.success) {
        setDismissedSuccessSubmissionId(currentSubmissionId);
      }
    }, feedbackTimeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [state.error, state.success, submissionId]);

  const visibleError =
    !pending &&
    state.error &&
    dismissedErrorSubmissionId !== submissionId
      ? state.error
      : undefined;
  const visibleSuccess =
    !pending &&
    state.success &&
    dismissedSuccessSubmissionId !== submissionId
      ? state.success
      : undefined;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-5"
      onSubmit={() => {
        setSubmissionId((currentValue) => currentValue + 1);
      }}
    >
      <div className="space-y-2">
        <label htmlFor="receipt" className="text-sm font-medium">
          Upload invoices or receipts
        </label>
        <input
          id="receipt"
          name="receipt"
          type="file"
          accept={acceptedReceiptFileInputValue}
          multiple
          required
          className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:font-medium file:text-white"
        />
        <p className="text-sm text-[var(--muted)]">
          Supported: PDF, JPG, PNG, WEBP. Max size: 10 MB each. You can
          select multiple files.
        </p>
      </div>

      {visibleError ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          <p>{visibleError}</p>
          <button
            type="button"
            onClick={() => setDismissedErrorSubmissionId(submissionId)}
            aria-label="Dismiss error message"
            className="shrink-0 rounded-full px-2 py-1 text-base leading-none transition hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            x
          </button>
        </div>
      ) : null}

      {visibleSuccess ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          <p>{visibleSuccess}</p>
          <button
            type="button"
            onClick={() => setDismissedSuccessSubmissionId(submissionId)}
            aria-label="Dismiss success message"
            className="shrink-0 rounded-full px-2 py-1 text-base leading-none transition hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          >
            x
          </button>
        </div>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {pending ? "Queueing receipts" : ""}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Queueing..." : "Upload and process in background"}
      </button>
    </form>
  );
}
