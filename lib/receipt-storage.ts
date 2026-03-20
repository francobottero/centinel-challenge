import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const receiptsDirectory = path.join(process.cwd(), "storage", "receipts");

function sanitizeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  return normalized.length > 0 ? normalized : "receipt.pdf";
}

export async function saveReceiptFile(file: File) {
  const originalName = sanitizeFileName(file.name || "receipt.pdf");
  const storedFileName = `${randomUUID()}-${originalName}`;
  const relativeFilePath = path.join("storage", "receipts", storedFileName);
  const absoluteFilePath = path.join(process.cwd(), relativeFilePath);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(receiptsDirectory, { recursive: true });
  await writeFile(absoluteFilePath, buffer);

  return {
    storedFileName,
    storedFilePath: relativeFilePath,
    fileMimeType: file.type || "application/pdf",
    fileSizeBytes: buffer.byteLength,
  };
}
