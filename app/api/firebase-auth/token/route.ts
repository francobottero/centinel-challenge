import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getFirebaseAdminAuth().createCustomToken(session.user.id, {
    email: session.user.email ?? undefined,
    name: session.user.name ?? undefined,
  });

  return NextResponse.json({ token, userId: session.user.id });
}
