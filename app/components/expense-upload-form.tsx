"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { DismissibleAlert } from "@/app/components/dismissible-alert";
import {
  type QueuedExpenseUpload,
  useExpenseUpload,
} from "@/app/hooks/use-expense-upload";
import { acceptedReceiptFileInputValue } from "@/lib/receipt-file-types";

const feedbackTimeoutMs = 5000;

type ExpenseUploadFormProps = {
  userEmail: string | null | undefined;
  onUploadQueued?: (
    uploadSessionId: string,
    queuedReports: QueuedExpenseUpload[],
  ) => void;
};

export function ExpenseUploadForm({
  userEmail,
  onUploadQueued,
}: ExpenseUploadFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadExpenseFiles } = useExpenseUpload();
  const [submissionId, setSubmissionId] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dismissedErrorSubmissionId, setDismissedErrorSubmissionId] = useState<
    number | null
  >(null);
  const [dismissedSuccessSubmissionId, setDismissedSuccessSubmissionId] =
    useState<number | null>(null);

  useEffect(() => {
    if (!error && !success) {
      return;
    }

    const currentSubmissionId = submissionId;
    const timeoutId = window.setTimeout(() => {
      if (error) {
        setDismissedErrorSubmissionId(currentSubmissionId);
      }

      if (success) {
        setDismissedSuccessSubmissionId(currentSubmissionId);
      }
    }, feedbackTimeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [error, success, submissionId]);

  const visibleError =
    !pending && error && dismissedErrorSubmissionId !== submissionId
      ? error
      : undefined;
  const visibleSuccess =
    !pending && success && dismissedSuccessSubmissionId !== submissionId
      ? success
      : undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionId((currentValue) => currentValue + 1);
    setError(null);
    setSuccess(null);
    setPending(true);

    const files = Array.from(inputRef.current?.files ?? []);

    if (files.length === 0) {
      setError("Please choose at least one receipt or invoice file to upload.");
      setPending(false);
      return;
    }

    try {
      const { failures, queuedCount, queuedReports, uploadSessionId } =
        await uploadExpenseFiles(files, userEmail);

      if (queuedCount === 0) {
        setError(failures.join(" "));
        setPending(false);
        return;
      }

      onUploadQueued?.(uploadSessionId, queuedReports);
      formRef.current?.reset();
      setSuccess(
        `Queued ${queuedCount} of ${files.length} receipt${
          files.length === 1 ? "" : "s"
        } for processing.`,
      );

      if (failures.length > 0) {
        setError(failures.join(" "));
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "We could not queue those documents for processing.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="receipt" className="text-sm font-medium">
          Upload invoices or receipts
        </label>
        <input
          ref={inputRef}
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
        <DismissibleAlert
          message={visibleError}
          onDismiss={() => setDismissedErrorSubmissionId(submissionId)}
          tone="error"
        />
      ) : null}

      {visibleSuccess ? (
        <DismissibleAlert
          message={visibleSuccess}
          onDismiss={() => setDismissedSuccessSubmissionId(submissionId)}
          tone="success"
        />
      ) : null}

      <div aria-live="polite" className="sr-only">
        {pending ? "Uploading receipts" : ""}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Uploading..." : "Upload and process in background"}
      </button>
    </form>
  );
}
