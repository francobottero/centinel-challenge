import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { expenseReportsCollectionName } from "@/lib/firebase-expense-reports";

type CreateExpenseReportBody = {
  uploadSessionId?: string;
  sourceFileName?: string;
  storagePath?: string;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
};

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateExpenseReportBody;

  if (
    !body.uploadSessionId ||
    !body.sourceFileName ||
    !body.storagePath ||
    typeof body.sourceFileName !== "string" ||
    typeof body.storagePath !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing required expense report metadata." },
      { status: 400 },
    );
  }

  const reportReference = getFirebaseAdminDb()
    .collection(expenseReportsCollectionName)
    .doc();

  await reportReference.set({
    userId: session.user.id,
    userName: session.user.name ?? null,
    userEmail: session.user.email ?? null,
    uploadSessionId: body.uploadSessionId,
    status: "UPLOADED",
    retryRequestedAt: null,
    processingError: null,
    invoiceNumber: null,
    description: null,
    amount: null,
    category: null,
    expenseDate: null,
    vendorName: null,
    additionalNotes: null,
    sourceFileName: body.sourceFileName,
    storagePath: body.storagePath,
    fileMimeType: body.fileMimeType ?? null,
    fileSizeBytes:
      typeof body.fileSizeBytes === "number" ? body.fileSizeBytes : null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    processingStartedAt: null,
    processedAt: null,
  });

  return NextResponse.json({ id: reportReference.id });
}
