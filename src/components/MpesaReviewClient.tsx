"use client";

import { useEffect, useState } from "react";

type MpesaTransactionStatusLiteral = "PENDING" | "SUCCESS" | "FAILED";

type MpesaReviewReasonLocal = "NO_STUDENT" | "MULTIPLE_STUDENTS" | "NO_FEES" | "OTHER";

type MpesaReviewItem = {
  id: number;
  studentFeeId: string | null;
  amount: number;
  phoneNumber: string;
  mpesaReceiptNumber: string | null;
  createdAt: string;
  status: MpesaTransactionStatusLiteral;
  reviewReason: MpesaReviewReasonLocal | null;
};

interface MpesaReviewResponse {
  data: MpesaReviewItem[];
}

const formatKes = (minor: number): string => `KES ${(minor / 100).toFixed(2)}`;

export default function MpesaReviewClient() {
  const [items, setItems] = useState<MpesaReviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/mpesa/review?take=100");

        if (!response.ok) {
          setError(`HTTP ${response.status}`);
          setItems([]);
          return;
        }

        const body = (await response.json()) as MpesaReviewResponse;

        if (!cancelled) {
          setItems(body.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load";
          setError(message);
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-1">
        <h1 className="text-lg font-semibold mb-1">M-Pesa Pending Transactions</h1>
        <p className="text-xs text-gray-500">
          This view lists recent pending M-Pesa transactions that require manual review and reconciliation.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md ring-1 ring-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left border-b">
              <th className="py-2 px-3">Created At</th>
              <th className="py-2 px-3">Phone</th>
              <th className="py-2 px-3">Amount (KES)</th>
              <th className="py-2 px-3">Student Fee ID</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Review Reason</th>
              <th className="py-2 px-3">M-Pesa Receipt</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="py-4 px-3 text-sm text-gray-500" colSpan={7}>
                  Loading pending M-Pesa transactions...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td className="py-4 px-3 text-sm text-red-600" colSpan={7}>
                  Failed to load transactions: {error}
                </td>
              </tr>
            )}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td className="py-4 px-3 text-sm text-gray-500" colSpan={7}>
                  No pending M-Pesa transactions found.
                </td>
              </tr>
            )}
            {!loading && !error &&
              items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="py-2 px-3 align-top text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 align-top break-all">{item.phoneNumber}</td>
                  <td className="py-2 px-3 align-top">{formatKes(item.amount)}</td>
                  <td className="py-2 px-3 align-top break-all">{item.studentFeeId ?? "-"}</td>
                  <td className="py-2 px-3 align-top">{item.status}</td>
                  <td className="py-2 px-3 align-top">
                    {item.reviewReason ?? "-"}
                  </td>
                  <td className="py-2 px-3 align-top break-all">{item.mpesaReceiptNumber ?? "-"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
