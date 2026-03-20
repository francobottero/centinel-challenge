import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const report = await prisma.expenseReport.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: {
      sourceFileName: true,
      storedFilePath: true,
      fileMimeType: true,
    },
  });

  if (!report?.storedFilePath) {
    return new NextResponse("File not found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(report.storedFilePath);

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
