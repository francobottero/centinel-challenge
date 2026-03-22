import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getFirebaseAdminDb, getFirebaseAdminStorage } from "@/lib/firebase-admin";
import {
  expenseReportsCollectionName,
  type ExpenseReportFirestoreDocument,
} from "@/lib/firebase-expense-reports";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const reportSnapshot = await getFirebaseAdminDb()
    .collection(expenseReportsCollectionName)
    .doc(id)
    .get();

  if (!reportSnapshot.exists) {
    return new NextResponse("File not found", { status: 404 });
  }

  const report = reportSnapshot.data() as ExpenseReportFirestoreDocument;

  if (report.userId !== session.user.id || !report.storagePath) {
    return new NextResponse("File not found", { status: 404 });
  }

  try {
    const [fileBuffer] = await getFirebaseAdminStorage()
      .bucket()
      .file(report.storagePath)
      .download();

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": report.fileMimeType || "application/pdf",
        "Content-Disposition": `inline; filename="${report.sourceFileName}"`,
      },
    });
  } catch {
    return new NextResponse("File not found", { status: 404 });
  }
}
