import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ExpenseReportDetailForm } from "@/app/components/expense-report-detail-form";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const report = await prisma.expenseReport.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: {
      id: true,
      invoiceNumber: true,
      description: true,
      amount: true,
      category: true,
      expenseDate: true,
      vendorName: true,
      additionalNotes: true,
      sourceFileName: true,
      storedFilePath: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!report) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-4xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur md:p-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
              Expense Detail
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              {report.vendorName ?? "Unknown vendor"}
            </h1>
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
              {report.updatedAt.toLocaleString("en-US")}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Created {report.createdAt.toLocaleString("en-US")}
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
                amount: report.amount?.toString() ?? null,
                expenseDate: report.expenseDate
                  ? report.expenseDate.toISOString().slice(0, 10)
                  : null,
              }}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
