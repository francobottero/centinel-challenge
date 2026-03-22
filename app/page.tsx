import { redirect } from "next/navigation";

import { AuthNavbar } from "@/app/components/auth-navbar";
import { ExpenseReportsDashboard } from "@/app/components/expense-reports-dashboard";
import { getSession } from "@/lib/auth";
import { getExpenseReportsDashboardData } from "@/lib/expense-report-data";

export default async function Home() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dashboardData = await getExpenseReportsDashboardData(session.user.id);

  return (
    <>
      <AuthNavbar name={session.user.name} email={session.user.email} />
      <main className="min-h-screen px-6 py-8 md:py-10">
        <section className="mx-auto w-full max-w-6xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur md:p-12">
          <ExpenseReportsDashboard
            userId={session.user.id}
            userName={session.user.name}
            initialReports={dashboardData.reports}
            initialSummary={dashboardData.summary}
            initialActiveUploadSessionId={dashboardData.selectedUploadSessionId}
          />
        </section>
      </main>
    </>
  );
}
