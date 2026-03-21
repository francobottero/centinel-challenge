import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getExpenseReportsDashboardData } from "@/lib/expense-report-data";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const uploadSessionId = searchParams.get("uploadSessionId");
  const data = await getExpenseReportsDashboardData(
    session.user.id,
    uploadSessionId,
  );

  return NextResponse.json(data);
}
