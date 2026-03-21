CREATE TYPE "ExpenseReportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "ExpenseReport"
ADD COLUMN "uploadSessionId" TEXT,
ADD COLUMN "status" "ExpenseReportStatus" NOT NULL DEFAULT 'UPLOADED',
ADD COLUMN "processingError" TEXT,
ADD COLUMN "processingStartedAt" TIMESTAMP(3),
ADD COLUMN "processedAt" TIMESTAMP(3);

CREATE INDEX "ExpenseReport_userId_uploadSessionId_createdAt_idx"
ON "ExpenseReport"("userId", "uploadSessionId", "createdAt" DESC);

CREATE INDEX "ExpenseReport_userId_status_createdAt_idx"
ON "ExpenseReport"("userId", "status", "createdAt" DESC);
