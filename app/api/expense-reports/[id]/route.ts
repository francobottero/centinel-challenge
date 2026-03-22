import { NextResponse } from "next/server";

import {
  deleteFailedExpenseReport,
  retryExpenseReportProcessing,
} from "@/app/actions/expense-reports";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await deleteFailedExpenseReport(id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await retryExpenseReportProcessing(id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
