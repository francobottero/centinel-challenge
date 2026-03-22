import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { buildFirebaseStorageFolder } from "@/lib/firebase-storage-folder";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storageFolder = buildFirebaseStorageFolder(
    session.user.email,
    session.user.id,
  );

  const token = await getFirebaseAdminAuth().createCustomToken(session.user.id, {
    email: session.user.email ?? undefined,
    name: session.user.name ?? undefined,
    storageFolder,
  });

  return NextResponse.json({ token, userId: session.user.id });
}
