"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";

import { ExpenseReportStatusBadge } from "@/app/components/expense-report-status-badge";
import { ExpenseUploadForm } from "@/app/components/expense-upload-form";
import { useExpenseReportStream } from "@/app/hooks/use-expense-report-stream";
import { formatExpenseAmount } from "@/lib/amount-formatting";
import type {
  ExpenseReportListItem,
  UploadSessionSummary,
} from "@/lib/expense-report-dashboard";
import { summarizeUploadSession } from "@/lib/expense-report-dashboard";
import { isPendingExpenseReportStatus } from "@/lib/expense-report-status";

type ExpenseReportsDashboardProps = {
  userId: string;
  userName: string | null | undefined;
  initialReports: ExpenseReportListItem[];
  initialSummary: UploadSessionSummary | null;
  initialActiveUploadSessionId: string | null;
};

export function ExpenseReportsDashboard({
  userId,
  userName,
  initialReports,
  initialSummary,
  initialActiveUploadSessionId,
}: ExpenseReportsDashboardProps) {
  const [reports, setReports] = useState(initialReports);
  const [summary, setSummary] = useState(initialSummary);
  const [currentUploadSessionId, setCurrentUploadSessionId] = useState<
    string | null
  >(initialActiveUploadSessionId);
  const [dismissedSummaryUploadSessionId, setDismissedSummaryUploadSessionId] =
    useState<string | null>(null);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeDeleteReportId, setActiveDeleteReportId] = useState<
    string | null
  >(null);
  const [isDeletingReport, startDeleteTransition] = useTransition();

  const hasPendingReports = useMemo(
    () => reports.some((report) => isPendingExpenseReportStatus(report.status)),
    [reports],
  );
  const visibleSummary =
    summary &&
    summary.uploadSessionId !== dismissedSummaryUploadSessionId
      ? summary
      : null;

  useExpenseReportStream({
    userId,
    uploadSessionId: currentUploadSessionId,
    enabled: hasPendingReports || Boolean(currentUploadSessionId),
    onMessage: useCallback((payload) => {
      setReports(payload.reports);
      setSummary(payload.summary);
      setCurrentUploadSessionId(
        payload.selectedUploadSessionId ?? payload.activeUploadSessionId,
      );
    }, []),
    onLiveUpdatingChange: useCallback((value: boolean) => {
      setIsLiveUpdating(value);
    }, []),
  });

  const handleDeleteFailedReport = useCallback(
    (reportId: string) => {
      setDeleteError(null);
      setActiveDeleteReportId(reportId);

      startDeleteTransition(async () => {
        try {
          const response = await fetch(`/api/expense-reports/${reportId}`, {
            method: "DELETE",
          });

          const result = (await response.json()) as {
            error?: string;
            success?: string;
          };

          if (!response.ok) {
            setDeleteError(
              result.error ?? "Could not delete that failed upload.",
            );
            return;
          }
          setReports((currentReports) => {
            const nextReports = currentReports.filter(
              (report) => report.id !== reportId,
            );
            setSummary(
              summarizeUploadSession(nextReports, currentUploadSessionId),
            );
            return nextReports;
          });
        } catch {
          setDeleteError("Could not delete that failed upload.");
        } finally {
          setActiveDeleteReportId(null);
        }
      });
    },
    [currentUploadSessionId],
  );

  return (
    <>
      <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
        <p className="text-sm font-medium text-[var(--muted)]">
          New expense report
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Upload invoice documents
        </h2>

        <div className="mt-6">
          <ExpenseUploadForm
            userName={userName}
            onUploadQueued={(uploadSessionId) => {
              setDismissedSummaryUploadSessionId(null);
              setCurrentUploadSessionId(uploadSessionId);
            }}
          />
        </div>
      </section>

      {visibleSummary ? (
        <section className="mt-6 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--muted)]">
                Current upload session
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {visibleSummary.completedFiles} of {visibleSummary.totalFiles} processed
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {visibleSummary.processingFiles} processing, {visibleSummary.queuedFiles} queued,
                {visibleSummary.failedFiles} failed.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isLiveUpdating && (
                <span className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
                  Live updating
                </span>
              )}
              <p className="rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted)]">
                {visibleSummary.progressPercentage}%
              </p>
              <button
                type="button"
                onClick={() =>
                  setDismissedSummaryUploadSessionId(visibleSummary.uploadSessionId)
                }
                aria-label="Dismiss upload session summary"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-sm text-[var(--muted)] transition hover:bg-[var(--background)]/70"
              >
                x
              </button>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--background)]/80">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
              style={{ width: `${visibleSummary.progressPercentage}%` }}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-10 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--muted)]">
              Saved expense reports
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Extracted invoices
            </h2>
          </div>
          <p className="rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted)]">
            {reports.length} saved
          </p>
        </div>

        {deleteError ? (
          <p className="mt-4 break-words rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </p>
        ) : null}

        {reports.length === 0 ? (
          <div className="mt-6 rounded-[1.25rem] border border-dashed border-[var(--border)] px-6 py-10 text-sm text-[var(--muted)]">
            No invoices uploaded yet. Add your first receipt to create an
            expense report.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {reports.map((report) => {
              const detailLabel = report.vendorName ?? report.sourceFileName;

              return (
                <article
                  key={report.id}
                  className="min-w-0 rounded-[1.25rem] border border-[var(--border)] bg-[var(--background)]/65 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="min-w-0 break-words text-2xl font-bold text-[var(--muted)]">
                          <Link
                            href={`/expense-reports/${report.id}`}
                            className="break-words transition hover:text-[var(--accent)]"
                          >
                            {detailLabel}
                          </Link>
                        </h2>
                        <ExpenseReportStatusBadge status={report.status} />
                      </div>

                      <p className="mt-2 line-clamp-1 text-sm font-semibold">
                        {report.description ??
                          (report.status === "FAILED"
                            ? "This receipt failed to process."
                            : "Waiting for extraction...")}
                      </p>

                      {report.processingError ? (
                        <p className="mt-2 break-words text-sm text-red-600">
                          {report.processingError}
                        </p>
                      ) : null}

                      {report.status === "FAILED" ? (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteFailedReport(report.id)}
                            disabled={isDeletingReport}
                            className="inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isDeletingReport && activeDeleteReportId === report.id
                              ? "Deleting..."
                              : "Delete failed upload"}
                          </button>
                        </div>
                      ) : null}

                      {report.storedFilePath ? (
                        <p className="mt-2 break-words text-sm text-[var(--muted)]">
                          Source file:{" "}
                          <Link
                            href={`/receipts/${report.id}`}
                            target="_blank"
                            className="break-all font-medium text-[var(--accent)] underline decoration-transparent transition hover:decoration-current"
                          >
                            {report.sourceFileName}
                          </Link>
                        </p>
                      ) : (
                        <p className="mt-2 break-words text-sm text-[var(--muted)]">
                          Source file: {report.sourceFileName}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-left md:text-right">
                      <p className="text-sm font-medium text-[var(--muted)]">
                        Amount
                      </p>
                      <p className="mt-1 text-xl font-semibold">
                        {formatExpenseAmount(report.amount) ?? "Pending"}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3">
                    <div>
                      <dt className="font-medium text-[var(--muted)]">
                        Invoice number
                      </dt>
                      <dd className="mt-1">
                        {report.invoiceNumber ?? "Not found yet"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[var(--muted)]">
                        Category
                      </dt>
                      <dd className="mt-1">
                        {report.category ?? "Uncategorized"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[var(--muted)]">
                        Expense date
                      </dt>
                      <dd className="mt-1">
                        {report.expenseDate
                          ? new Date(report.expenseDate).toLocaleDateString("en-US")
                          : "Unknown"}
                      </dd>
                    </div>
                  </dl>

                  {report.additionalNotes && (
                    <div className="mt-5 rounded-[1rem] border border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
                      <span className="font-medium text-[var(--foreground)]">
                        Additional notes:
                      </span>{" "}
                      {report.additionalNotes}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
