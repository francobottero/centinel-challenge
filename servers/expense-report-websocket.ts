import { createServer } from "node:http";

import { WebSocketServer } from "ws";

import { getExpenseReportsDashboardData } from "../lib/expense-report-data";

const port = Number(process.env.EXPENSE_REPORT_WS_PORT ?? 3001);
const server = createServer();
const webSocketServer = new WebSocketServer({ server });

webSocketServer.on("connection", (socket, request) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const userId = requestUrl.searchParams.get("userId");
  const uploadSessionId = requestUrl.searchParams.get("uploadSessionId");

  if (!userId) {
    socket.close(1008, "Missing userId.");
    return;
  }

  let intervalId: ReturnType<typeof setInterval> | null = null;

  const sendSnapshot = async () => {
    const data = await getExpenseReportsDashboardData(userId, uploadSessionId);

    socket.send(JSON.stringify(data));

    if (
      !data.reports.some(
        (report) => report.status === "UPLOADED" || report.status === "PROCESSING",
      ) &&
      intervalId
    ) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  void sendSnapshot();

  intervalId = setInterval(() => {
    if (socket.readyState === socket.OPEN) {
      void sendSnapshot();
    }
  }, 3000);

  socket.on("close", () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  socket.on("error", () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
});

server.listen(port, () => {
  console.log(`Expense report websocket server listening on ws://localhost:${port}`);
});
