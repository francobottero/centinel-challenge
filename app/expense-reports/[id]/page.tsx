import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AuthNavbar } from "@/app/components/auth-navbar";
import { ExpenseReportDetailForm } from "@/app/components/expense-report-detail-form";
import { ExpenseReportStatusBadge } from "@/app/components/expense-report-status-badge";
import { getSession } from "@/lib/auth";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import {
  expenseReportsCollectionName,
  serializeExpenseReportData,
  type ExpenseReportFirestoreDocument,
} from "@/lib/firebase-expense-reports";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExpenseReportDetailPage(props: PageProps) {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await props.params;

  const reportSnapshot = await getFirebaseAdminDb()
    .collection(expenseReportsCollectionName)
    .doc(id)
    .get();

  if (!reportSnapshot.exists) {
    notFound();
  }

  const rawReport = reportSnapshot.data() as ExpenseReportFirestoreDocument;

  if (rawReport.userId !== session.user.id) {
    notFound();
  }

  const report = serializeExpenseReportData(reportSnapshot.id, rawReport);
  const updatedAtLabel = new Date(report.updatedAt).toLocaleString("en-US");
  const createdAtLabel = new Date(report.createdAt).toLocaleString("en-US");

  return (
    <>
      <AuthNavbar
        name={session.user.name}
        email={session.user.email}
      />
      <main className="min-h-screen px-6 py-8 md:py-10">
        <section className="mx-auto w-full max-w-4xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur md:p-12">

          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
              Expense Detail
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight">
                {report.vendorName ?? report.sourceFileName}
              </h1>
              <ExpenseReportStatusBadge status={report.status} />
            </div>
          </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--surface-strong)]"
            >
              Back to dashboard
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
              <p className="text-sm font-medium text-[var(--muted)]">
                Uploaded file
              </p>
              <p className="mt-3 text-xl font-semibold">{report.sourceFileName}</p>
            </article>

            <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
              <p className="text-sm font-medium text-[var(--muted)]">
                Last updated
              </p>
              <p className="mt-3 text-xl font-semibold">
                {updatedAtLabel}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Created {createdAtLabel}
              </p>
            </article>
          </div>

          <section className="mt-10 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-[var(--muted)]">
                Extracted fields
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Review and edit
              </h2>
            </div>

            <div className="mt-6">
              <ExpenseReportDetailForm
                report={{
                  ...report,
                  amount: report.amount ?? null,
                  expenseDate: report.expenseDate ?? null,
                }}
              />
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
