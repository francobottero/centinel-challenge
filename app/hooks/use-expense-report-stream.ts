"use client";

import { useEffect } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { firebaseClientDb } from "@/lib/firebase-client";
import { ensureFirebaseClientSession } from "@/lib/firebase-client-session";
import {
  createExpenseReportSnapshot,
  expenseReportsCollectionName,
  type ExpenseReportStreamPayload,
  serializeExpenseReportData,
} from "@/lib/firebase-expense-reports";
import { isPendingExpenseReportStatus } from "@/lib/expense-report-status";

type UseExpenseReportStreamParams = {
  userId: string;
  uploadSessionId: string | null;
  enabled: boolean;
  onMessage: (payload: ExpenseReportStreamPayload) => void;
  onLiveUpdatingChange: (value: boolean) => void;
};

export function useExpenseReportStream({
  userId,
  uploadSessionId,
  enabled,
  onMessage,
  onLiveUpdatingChange,
}: UseExpenseReportStreamParams) {
  useEffect(() => {
    if (!enabled) {
      onLiveUpdatingChange(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let isCancelled = false;

    void ensureFirebaseClientSession()
      .then(() => {
        if (isCancelled) {
          return;
        }

        const reportsQuery = query(
          collection(firebaseClientDb, expenseReportsCollectionName),
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
        );

        onLiveUpdatingChange(true);
        unsubscribe = onSnapshot(
          reportsQuery,
          (snapshot) => {
            const reports = snapshot.docs.map((document) =>
              serializeExpenseReportData(document.id, document.data()),
            );
            const payload = createExpenseReportSnapshot(reports, uploadSessionId);

            onMessage(payload);

            if (!reports.some((report) => isPendingExpenseReportStatus(report.status))) {
              onLiveUpdatingChange(false);
            }
          },
          () => {
            onLiveUpdatingChange(false);
          },
        );
      })
      .catch(() => {
        onLiveUpdatingChange(false);
      });

    return () => {
      isCancelled = true;
      unsubscribe?.();
      onLiveUpdatingChange(false);
    };
  }, [enabled, onLiveUpdatingChange, onMessage, uploadSessionId, userId]);
}
