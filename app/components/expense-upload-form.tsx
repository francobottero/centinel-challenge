"use client";

import {
  deleteObject,
  ref,
  uploadBytes,
} from "firebase/storage";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { firebaseClientStorage } from "@/lib/firebase-client";
import { ensureFirebaseClientSession } from "@/lib/firebase-client-session";
import { buildFirebaseStorageFolder } from "@/lib/firebase-storage-folder";
import { acceptedReceiptFileInputValue } from "@/lib/receipt-file-types";

const feedbackTimeoutMs = 5000;
const acceptedReceiptMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type ExpenseUploadFormProps = {
  userEmail: string | null | undefined;
  onUploadQueued?: (
    uploadSessionId: string,
    queuedReports: Array<{
      id: string;
      sourceFileName: string;
      storedFilePath: string;
    }>,
  ) => void;
};

export function ExpenseUploadForm({
  userEmail,
  onUploadQueued,
}: ExpenseUploadFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

    const uploadSessionId = crypto.randomUUID();
    let queuedCount = 0;
    const failures: string[] = [];
    const queuedReports: Array<{
      id: string;
      sourceFileName: string;
      storedFilePath: string;
    }> = [];

    try {
      const firebaseUser = await ensureFirebaseClientSession();

      if (!firebaseUser) {
        throw new Error("Could not initialize the Firebase upload session.");
      }

      for (const file of files) {
        try {
          validateReceiptFileForClient(file);

          const sanitizedFileName = sanitizeFileName(file.name || "receipt");
          const userStorageFolder = buildFirebaseStorageFolder(
            userEmail,
            firebaseUser.uid,
          );
          const storagePath = `users/${userStorageFolder}/receipts/${crypto.randomUUID()}-${sanitizedFileName}`;
          const storageReference = ref(firebaseClientStorage, storagePath);
          const uploadResult = await uploadBytes(storageReference, file, {
            contentType: file.type || "application/pdf",
          });

          try {
            const response = await fetch("/api/expense-reports", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
              uploadSessionId,
              sourceFileName: file.name || "uploaded-document",
              storagePath,
              fileMimeType:
                uploadResult.metadata.contentType ||
                file.type ||
                "application/pdf",
              fileSizeBytes: file.size,
              }),
            });

            if (!response.ok) {
              const result = (await response.json()) as {
                error?: string;
              };
              throw new Error(
                result.error ?? "We could not create the expense report record.",
              );
            }

            const result = (await response.json()) as {
              id: string;
            };

            queuedReports.push({
              id: result.id,
              sourceFileName: file.name || "uploaded-document",
              storedFilePath: storagePath,
            });
          } catch (writeError) {
            await deleteObject(storageReference).catch(() => undefined);
            throw new Error(
              writeError instanceof Error
                ? `We uploaded the file but could not create its expense report record: ${writeError.message}`
                : "We uploaded the file but could not create its expense report record.",
            );
          }

          queuedCount += 1;
        } catch (uploadError) {
          failures.push(
            `${file.name}: ${
              uploadError instanceof Error
                ? uploadError.message
                : "we could not upload that file."
            }`,
          );
        }
      }

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

function sanitizeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  return normalized.length > 0 ? normalized : "receipt";
}

function validateReceiptFileForClient(file: File) {
  if (file.size === 0) {
    throw new Error("Please choose a receipt or invoice file to upload.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Please upload a file smaller than 10 MB.");
  }

  if (file.type && !acceptedReceiptMimeTypes.has(file.type)) {
    throw new Error("Supported file types are PDF, JPG, PNG, and WEBP.");
  }
}
