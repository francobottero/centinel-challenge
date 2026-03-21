import { getSession } from "@/lib/auth";
import { getExpenseReportsDashboardData } from "@/lib/expense-report-data";

const encoder = new TextEncoder();

function createEventPayload(data: unknown) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const uploadSessionId = searchParams.get("uploadSessionId");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendSnapshot = async () => {
        const data = await getExpenseReportsDashboardData(
          userId,
          uploadSessionId,
        );

        controller.enqueue(createEventPayload(data));

        return data;
      };

      let intervalId: ReturnType<typeof setInterval> | null = null;

      try {
        const initialData = await sendSnapshot();

        if (initialData.reports.some((report) => report.status === "UPLOADED" || report.status === "PROCESSING")) {
          intervalId = setInterval(async () => {
            try {
              const nextData = await sendSnapshot();

              if (
                !nextData.reports.some(
                  (report) =>
                    report.status === "UPLOADED" || report.status === "PROCESSING",
                )
              ) {
                if (intervalId) {
                  clearInterval(intervalId);
                  intervalId = null;
                }
              }
            } catch {
              // Ignore transient streaming refresh issues and keep the stream open.
            }
          }, 3000);
        }
      } catch {
        controller.error(new Error("Could not stream expense reports."));
        return;
      }

      request.signal.addEventListener("abort", () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
