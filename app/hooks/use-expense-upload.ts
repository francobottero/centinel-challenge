"use client";

import { deleteObject, ref, uploadBytes } from "firebase/storage";

import { firebaseClientStorage } from "@/lib/firebase-client";
import { ensureFirebaseClientSession } from "@/lib/firebase-client-session";
import { buildFirebaseStorageFolder } from "@/lib/firebase-storage-folder";

const acceptedReceiptMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type QueuedExpenseUpload = {
  id: string;
  sourceFileName: string;
  storedFilePath: string;
};

export type ExpenseUploadResult = {
  failures: string[];
  queuedCount: number;
  queuedReports: QueuedExpenseUpload[];
  uploadSessionId: string;
};

export function useExpenseUpload() {
  async function uploadExpenseFiles(
    files: File[],
    userEmail: string | null | undefined,
  ): Promise<ExpenseUploadResult> {
    if (files.length === 0) {
      throw new Error("Please choose at least one receipt or invoice file to upload.");
    }

    const uploadSessionId = crypto.randomUUID();
    let queuedCount = 0;
    const failures: string[] = [];
    const queuedReports: QueuedExpenseUpload[] = [];

    const firebaseUser = await ensureFirebaseClientSession();

    if (!firebaseUser) {
      throw new Error("Could not initialize the Firebase upload session.");
    }

    for (const file of files) {
      try {
        validateReceiptFileForClient(file);

        const sanitizedFileName = sanitizeFileName(file.name || "receipt");
        const userStorageFolder = buildFirebaseStorageFolder(
          userEmail,
          firebaseUser.uid,
        );
        const storagePath = `users/${userStorageFolder}/receipts/${crypto.randomUUID()}-${sanitizedFileName}`;
        const storageReference = ref(firebaseClientStorage, storagePath);
        const uploadResult = await uploadBytes(storageReference, file, {
          contentType: file.type || "application/pdf",
        });

        try {
          const response = await fetch("/api/expense-reports", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              uploadSessionId,
              sourceFileName: file.name || "uploaded-document",
              storagePath,
              fileMimeType:
                uploadResult.metadata.contentType ||
                file.type ||
                "application/pdf",
              fileSizeBytes: file.size,
            }),
          });

          const result = (await response.json()) as {
            error?: string;
            id?: string;
          };

          if (!response.ok || !result.id) {
            throw new Error(
              result.error ?? "We could not create the expense report record.",
            );
          }

          queuedReports.push({
            id: result.id,
            sourceFileName: file.name || "uploaded-document",
            storedFilePath: storagePath,
          });
        } catch (writeError) {
          await deleteObject(storageReference).catch(() => undefined);
          throw new Error(
            writeError instanceof Error
              ? `We uploaded the file but could not create its expense report record: ${writeError.message}`
              : "We uploaded the file but could not create its expense report record.",
          );
        }

        queuedCount += 1;
      } catch (uploadError) {
        failures.push(
          `${file.name}: ${
            uploadError instanceof Error
              ? uploadError.message
              : "we could not upload that file."
          }`,
        );
      }
    }

    return {
      failures,
      queuedCount,
      queuedReports,
      uploadSessionId,
    };
  }

  return {
    uploadExpenseFiles,
  };
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  return normalized.length > 0 ? normalized : "receipt";
}

function validateReceiptFileForClient(file: File) {
  if (file.size === 0) {
    throw new Error("Please choose a receipt or invoice file to upload.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Please upload a file smaller than 10 MB.");
  }

  if (file.type && !acceptedReceiptMimeTypes.has(file.type)) {
    throw new Error("Supported file types are PDF, JPG, PNG, and WEBP.");
  }
}
