import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import {
  createExpenseReportSnapshot,
  expenseReportsCollectionName,
  serializeExpenseReportDoc,
} from "@/lib/firebase-expense-reports";

export async function getExpenseReportsDashboardData(
  userId: string,
  preferredUploadSessionId?: string | null,
) {
  const snapshot = await getFirebaseAdminDb()
    .collection(expenseReportsCollectionName)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return createExpenseReportSnapshot(
    snapshot.docs.map(serializeExpenseReportDoc),
    preferredUploadSessionId,
  );
}
