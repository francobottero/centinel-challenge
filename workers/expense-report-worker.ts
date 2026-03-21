import { Worker } from "bullmq";

import {
  type ExpenseReportJobData,
  expenseReportQueueName,
  getExpenseReportQueueConnection,
} from "../lib/expense-report-queue";
import { processExpenseReport } from "../lib/expense-report-processing";

const worker = new Worker<ExpenseReportJobData>(
  expenseReportQueueName,
  async (job) => {
    await processExpenseReport(job.data.reportId);
  },
  {
    connection: getExpenseReportQueueConnection(),
    concurrency: Number(process.env.EXPENSE_REPORT_WORKER_CONCURRENCY ?? 3),
  },
);

worker.on("completed", (job) => {
  console.log(`Completed expense report job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Expense report job ${job?.id ?? "unknown"} failed`, error);
});

console.log("Expense report worker started.");

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
