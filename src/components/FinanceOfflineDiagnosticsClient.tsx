"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import type { FinanceQueueItem } from "@/lib/financeOfflineQueue";
import {
  listFinanceQueueItems,
  updateFinanceQueueItem,
} from "@/lib/financeOfflineQueue";
import type {
  AttendanceQueueItem,
  CreateAttendanceOperationPayload,
  UpdateAttendanceOperationPayload,
} from "@/lib/attendanceOfflineQueue";
import {
  listAttendanceQueueItems,
  updateAttendanceQueueItem,
} from "@/lib/attendanceOfflineQueue";
import type {
  CreateResultOperationPayload,
  ResultQueueItem,
  UpdateResultOperationPayload,
} from "@/lib/resultsOfflineQueue";
import {
  listResultQueueItems,
  updateResultQueueItem,
} from "@/lib/resultsOfflineQueue";

interface FailedPaymentItemView {
  id: string;
  studentFeeId: string;
  amountKes: string;
  method: string;
  reference: string;
  lastError: string;
  updatedAt: string;
}

type AttendanceSyncResultStatus = "succeeded" | "failed";

interface AttendanceSyncResultItem {
  clientRequestId: string;
  status: AttendanceSyncResultStatus;
  errorMessage?: string | undefined;
}

interface AttendanceSyncResponse {
  results: AttendanceSyncResultItem[];
}

type AttendanceSyncOperation =
  | {
      type: "CREATE_ATTENDANCE";
      payload: CreateAttendanceOperationPayload;
    }
  | {
      type: "UPDATE_ATTENDANCE";
      payload: UpdateAttendanceOperationPayload;
    };

type ResultSyncStatus = "succeeded" | "failed";

interface ResultSyncResultItem {
  clientRequestId: string;
  status: ResultSyncStatus;
  errorMessage?: string | undefined;
}

interface ResultSyncResponse {
  results: ResultSyncResultItem[];
}

type ResultSyncOperation =
  | {
      type: "CREATE_RESULT";
      payload: CreateResultOperationPayload;
    }
  | {
      type: "UPDATE_RESULT";
      payload: UpdateResultOperationPayload;
    };

export default function FinanceOfflineDiagnosticsClient() {
  const [paymentItems, setPaymentItems] = useState<FailedPaymentItemView[]>([]);
  const [attendanceItems, setAttendanceItems] = useState<AttendanceFailedItemView[]>([]);
  const [resultItems, setResultItems] = useState<ResultFailedItemView[]>([]);

  const reloadItems = async (): Promise<void> => {
    const [financeAll, attendanceAll, resultAll] = await Promise.all([
      listFinanceQueueItems(),
      listAttendanceQueueItems(),
      listResultQueueItems(),
    ]);

    const financeFailed = financeAll.filter(
      (item: FinanceQueueItem) => item.status === "failed",
    );

    const mappedFinance: FailedPaymentItemView[] = financeFailed.map((item) => {
      const { payload, lastError, updatedAt } = item;
      const amountKes = (payload.amount ?? 0).toFixed(2);
      const errorText = lastError ?? "Unknown error";

      return {
        id: item.id,
        studentFeeId: payload.studentFeeId,
        amountKes,
        method: payload.method,
        reference: payload.reference ?? "",
        lastError: errorText,
        updatedAt: new Date(updatedAt).toLocaleString(),
      };
    });

    const attendanceFailed = attendanceAll.filter(
      (item: AttendanceQueueItem) => item.status === "failed",
    );

    const mappedAttendance: AttendanceFailedItemView[] = attendanceFailed.map((item) => {
      const { payload, lastError, updatedAt } = item;
      const errorText = lastError ?? "Unknown error";

      return {
        id: item.id,
        studentId: payload.studentId,
        lessonId: payload.lessonId,
        date: payload.date,
        present: payload.present,
        lastError: errorText,
        updatedAt: new Date(updatedAt).toLocaleString(),
      };
    });

    const resultFailed = resultAll.filter(
      (item: ResultQueueItem) => item.status === "failed",
    );

    const mappedResults: ResultFailedItemView[] = resultFailed.map((item) => {
      const { payload, lastError, updatedAt } = item;
      const errorText = lastError ?? "Unknown error";

      return {
        id: item.id,
        studentId: payload.studentId,
        score: payload.score.toFixed(2),
        examId: payload.examId,
        assignmentId: payload.assignmentId,
        lastError: errorText,
        updatedAt: new Date(updatedAt).toLocaleString(),
      };
    });

    setPaymentItems(mappedFinance);
    setAttendanceItems(mappedAttendance);
    setResultItems(mappedResults);
  };

  const handleRetryPayment = async (id: string): Promise<void> => {
    if (typeof window === "undefined" || !navigator.onLine) {
      toast.error("Cannot retry payment while offline.");
      return;
    }

    const all = await listFinanceQueueItems();
    const item = all.find((queueItem) => queueItem.id === id);

    if (!item) {
      toast.error("Offline payment item not found.");
      return;
    }

    await updateFinanceQueueItem(id, { status: "syncing", lastError: null });

    try {
      const { payload } = item;

      const body: Record<string, unknown> = {
        studentFeeId: payload.studentFeeId,
        amount: payload.amount,
        method: payload.method,
        clientRequestId: payload.clientRequestId,
      };

      if (payload.reference !== null && payload.reference.trim().length > 0) {
        body.reference = payload.reference;
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        await updateFinanceQueueItem(id, {
          status: "failed",
          lastError: message,
        });
        toast.error(`Payment retry failed: ${message}`);
      } else {
        await response.json();
        await updateFinanceQueueItem(id, {
          status: "succeeded",
          lastError: null,
        });
        toast.success("Payment sync retried successfully.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await updateFinanceQueueItem(id, {
        status: "failed",
        lastError: message,
      });
      toast.error(`Payment retry failed: ${message}`);
    } finally {
      await reloadItems();
    }
  };

  const handleRetryAttendance = async (id: string): Promise<void> => {
    if (typeof window === "undefined" || !navigator.onLine) {
      toast.error("Cannot retry attendance while offline.");
      return;
    }

    const all = await listAttendanceQueueItems();
    const item = all.find((queueItem) => queueItem.id === id);

    if (!item) {
      toast.error("Offline attendance item not found.");
      return;
    }

    await updateAttendanceQueueItem(id, { status: "syncing", lastError: null });

    const operation: AttendanceSyncOperation =
      item.type === "CREATE_ATTENDANCE"
        ? {
            type: "CREATE_ATTENDANCE",
            payload: item.payload as CreateAttendanceOperationPayload,
          }
        : {
            type: "UPDATE_ATTENDANCE",
            payload: item.payload as UpdateAttendanceOperationPayload,
          };

    try {
      const response = await fetch("/api/sync/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operations: [operation] }),
      });

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        await updateAttendanceQueueItem(id, {
          status: "failed",
          lastError: message,
        });
        toast.error(`Attendance retry failed: ${message}`);
        await reloadItems();
        return;
      }

      const data = (await response.json()) as AttendanceSyncResponse;
      const firstResult = data.results[0];

      if (!firstResult || firstResult.status !== "succeeded") {
        const message = firstResult?.errorMessage ?? "Sync failed";
        await updateAttendanceQueueItem(id, {
          status: "failed",
          lastError: message,
        });
        toast.error(`Attendance retry failed: ${message}`);
        await reloadItems();
        return;
      }

      await updateAttendanceQueueItem(id, {
        status: "succeeded",
        lastError: null,
      });
      toast.success("Attendance sync retried successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await updateAttendanceQueueItem(id, {
        status: "failed",
        lastError: message,
      });
      toast.error(`Attendance retry failed: ${message}`);
    } finally {
      await reloadItems();
    }
  };

  const handleRetryResult = async (id: string): Promise<void> => {
    if (typeof window === "undefined" || !navigator.onLine) {
      toast.error("Cannot retry result while offline.");
      return;
    }

    const all = await listResultQueueItems();
    const item = all.find((queueItem) => queueItem.id === id);

    if (!item) {
      toast.error("Offline result item not found.");
      return;
    }

    await updateResultQueueItem(id, { status: "syncing", lastError: null });

    const operation: ResultSyncOperation =
      item.type === "CREATE_RESULT"
        ? {
            type: "CREATE_RESULT",
            payload: item.payload as CreateResultOperationPayload,
          }
        : {
            type: "UPDATE_RESULT",
            payload: item.payload as UpdateResultOperationPayload,
          };

    try {
      const response = await fetch("/api/sync/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operations: [operation] }),
      });

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        await updateResultQueueItem(id, {
          status: "failed",
          lastError: message,
        });
        toast.error(`Result retry failed: ${message}`);
        await reloadItems();
        return;
      }

      const data = (await response.json()) as ResultSyncResponse;
      const firstResult = data.results[0];

      if (!firstResult || firstResult.status !== "succeeded") {
        const message = firstResult?.errorMessage ?? "Sync failed";
        await updateResultQueueItem(id, {
          status: "failed",
          lastError: message,
        });
        toast.error(`Result retry failed: ${message}`);
        await reloadItems();
        return;
      }

      await updateResultQueueItem(id, {
        status: "succeeded",
        lastError: null,
      });
      toast.success("Result sync retried successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await updateResultQueueItem(id, {
        status: "failed",
        lastError: message,
      });
      toast.error(`Result retry failed: ${message}`);
    } finally {
      await reloadItems();
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (cancelled) {
        return;
      }

      await reloadItems();
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="p-4 rounded-md ring-1 ring-gray-200">
        <h1 className="text-lg font-semibold mb-1">Offline Payment Sync Diagnostics</h1>
        <p className="text-xs text-gray-500">
          This view lists locally queued student fee payments that failed to sync to the server.
          Data is stored only in this browser and is not shared across devices. Click a row to retry
          sync for that item.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md ring-1 ring-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left border-b">
              <th className="py-2 px-3">Student Fee ID</th>
              <th className="py-2 px-3">Amount (KES)</th>
              <th className="py-2 px-3">Method</th>
              <th className="py-2 px-3">Reference</th>
              <th className="py-2 px-3">Last Error</th>
              <th className="py-2 px-3">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {paymentItems.map((item) => (
              <tr
                key={item.id}
                className="border-b last:border-b-0"
                onClick={() => {
                  void handleRetryPayment(item.id);
                }}
              >
                <td className="py-2 px-3 align-top break-all">{item.studentFeeId}</td>
                <td className="py-2 px-3 align-top">{item.amountKes}</td>
                <td className="py-2 px-3 align-top">{item.method}</td>
                <td className="py-2 px-3 align-top break-all">{item.reference}</td>
                <td className="py-2 px-3 align-top text-red-600 text-xs">{item.lastError}</td>
                <td className="py-2 px-3 align-top text-xs text-gray-500">{item.updatedAt}</td>
              </tr>
            ))}
            {paymentItems.length === 0 && (
              <tr>
                <td className="py-4 px-3 text-sm text-gray-500" colSpan={6}>
                  No failed offline payment syncs found on this device.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-md ring-1 ring-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left border-b">
              <th className="py-2 px-3">Student ID</th>
              <th className="py-2 px-3">Lesson ID</th>
              <th className="py-2 px-3">Date</th>
              <th className="py-2 px-3">Present</th>
              <th className="py-2 px-3">Last Error</th>
              <th className="py-2 px-3">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {attendanceItems.map((item) => (
              <tr
                key={item.id}
                className="border-b last:border-b-0"
                onClick={() => {
                  void handleRetryAttendance(item.id);
                }}
              >
                <td className="py-2 px-3 align-top break-all">{item.studentId}</td>
                <td className="py-2 px-3 align-top">{item.lessonId}</td>
                <td className="py-2 px-3 align-top">{item.date}</td>
                <td className="py-2 px-3 align-top">{item.present ? "Present" : "Absent"}</td>
                <td className="py-2 px-3 align-top text-red-600 text-xs">{item.lastError}</td>
                <td className="py-2 px-3 align-top text-xs text-gray-500">{item.updatedAt}</td>
              </tr>
            ))}
            {attendanceItems.length === 0 && (
              <tr>
                <td className="py-4 px-3 text-sm text-gray-500" colSpan={6}>
                  No failed offline attendance syncs found on this device.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-md ring-1 ring-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left border-b">
              <th className="py-2 px-3">Student ID</th>
              <th className="py-2 px-3">Score</th>
              <th className="py-2 px-3">Exam ID</th>
              <th className="py-2 px-3">Assignment ID</th>
              <th className="py-2 px-3">Last Error</th>
              <th className="py-2 px-3">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {resultItems.map((item) => (
              <tr
                key={item.id}
                className="border-b last:border-b-0"
                onClick={() => {
                  void handleRetryResult(item.id);
                }}
              >
                <td className="py-2 px-3 align-top break-all">{item.studentId}</td>
                <td className="py-2 px-3 align-top">{item.score}</td>
                <td className="py-2 px-3 align-top">{item.examId ?? ""}</td>
                <td className="py-2 px-3 align-top">{item.assignmentId ?? ""}</td>
                <td className="py-2 px-3 align-top text-red-600 text-xs">{item.lastError}</td>
                <td className="py-2 px-3 align-top text-xs text-gray-500">{item.updatedAt}</td>
              </tr>
            ))}
            {resultItems.length === 0 && (
              <tr>
                <td className="py-4 px-3 text-sm text-gray-500" colSpan={6}>
                  No failed offline results syncs found on this device.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface AttendanceFailedItemView {
  id: string;
  studentId: string;
  lessonId: number;
  date: string;
  present: boolean;
  lastError: string;
  updatedAt: string;
}

interface ResultFailedItemView {
  id: string;
  studentId: string;
  score: string;
  examId: number | undefined;
  assignmentId: number | undefined;
  lastError: string;
  updatedAt: string;
}
