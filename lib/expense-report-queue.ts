import { Queue, type ConnectionOptions } from "bullmq";

export const expenseReportQueueName = "expense-report-processing";
export type ExpenseReportJobData = {
  reportId: string;
};

let connectionSingleton: ConnectionOptions | null = null;
let queueSingleton: Queue | null = null;

function getRedisUrl() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is missing from your environment.");
  }

  return redisUrl;
}

export function getExpenseReportQueueConnection() {
  if (!connectionSingleton) {
    const redisUrl = new URL(getRedisUrl());

    connectionSingleton = {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      username: redisUrl.username || undefined,
      password: redisUrl.password || undefined,
      tls: redisUrl.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }

  return connectionSingleton;
}

export function getExpenseReportQueue(): Queue {
  if (!queueSingleton) {
    queueSingleton = new Queue(expenseReportQueueName, {
      connection: getExpenseReportQueueConnection(),
    });
  }

  return queueSingleton;
}

export async function enqueueExpenseReportProcessing(reportId: string) {
  const queue = getExpenseReportQueue();

  await queue.add(
    "process-expense-report",
    { reportId },
    {
      jobId: reportId,
      removeOnComplete: 500,
      removeOnFail: 1000,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
    },
  );
}
