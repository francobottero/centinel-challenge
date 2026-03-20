import { redirect } from "next/navigation";
import Link from "next/link";

import { ExpenseUploadForm } from "@/app/components/expense-upload-form";
import { LogoutButton } from "@/app/components/logout-button";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseReport } from "@prisma/client";

export default async function Home() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const expenseReports: ExpenseReport[] = await prisma.expenseReport.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-6xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur md:p-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
              Protected Area
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Upload receipts and extract expense data.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
              This page is protected for authenticated users and now turns
              invoice documents into saved expense reports with an LLM-powered
              extraction step.
            </p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
            <p className="text-sm font-medium text-[var(--muted)]">Signed in as</p>
            <p className="mt-3 text-2xl font-semibold">
              {session.user.name ?? "Unnamed user"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {session.user.email}
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
            <p className="text-sm font-medium text-[var(--muted)]">Stack</p>
            <p className="mt-3 text-2xl font-semibold">Next.js + Prisma + Gemini</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Upload receipts, parse them into a structured expense report, and
              persist each extracted entry in Postgres.
            </p>
          </article>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
            <div className="max-w-lg">
              <p className="text-sm font-medium text-[var(--muted)]">
                New expense report
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Upload an invoice document
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                The model will extract invoice number, description, amount,
                category, expense date, vendor name, and any useful notes.
              </p>
            </div>

            <div className="mt-6">
              <ExpenseUploadForm />
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
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
                {expenseReports.length} saved
              </p>
            </div>

            {expenseReports.length === 0 ? (
              <div className="mt-6 rounded-[1.25rem] border border-dashed border-[var(--border)] px-6 py-10 text-sm text-[var(--muted)]">
                No invoices uploaded yet. Add your first receipt to create an
                expense report.
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {expenseReports.map((report: ExpenseReport) => (
                  <article
                    key={report.id}
                    className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--background)]/65 p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--muted)]">
                          {report.vendorName ?? "Unknown vendor"}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {report.description ?? "Untitled expense"}
                        </p>
                        {report.storedFilePath ? (
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            Source file:{" "}
                            <Link
                              href={`/receipts/${report.id}`}
                              target="_blank"
                              className="font-medium text-[var(--accent)] underline decoration-transparent transition hover:decoration-current"
                            >
                              {report.sourceFileName}
                            </Link>
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            Source file: {report.sourceFileName}
                          </p>
                        )}
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-sm font-medium text-[var(--muted)]">
                          Amount
                        </p>
                        <p className="mt-1 text-xl font-semibold">
                          {report.amount ? `$${report.amount.toString()}` : "Unknown"}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3">
                      <div>
                        <dt className="font-medium text-[var(--muted)]">
                          Invoice number
                        </dt>
                        <dd className="mt-1">
                          {report.invoiceNumber ?? "Not found"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-[var(--muted)]">
                          Category
                        </dt>
                        <dd className="mt-1">{report.category ?? "Uncategorized"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-[var(--muted)]">
                          Expense date
                        </dt>
                        <dd className="mt-1">
                          {report.expenseDate
                            ? report.expenseDate.toLocaleDateString("en-US")
                            : "Unknown"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 rounded-[1rem] border border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
                      <span className="font-medium text-[var(--foreground)]">
                        Additional notes:
                      </span>{" "}
                      {report.additionalNotes ?? "No extra notes."}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
