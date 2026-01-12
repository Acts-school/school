"use client";

import { useState } from "react";
import { usePayments, type StudentFeePaymentRow } from "@/hooks/usePayments";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

export type StudentFeePaymentsHistoryProps = {
  studentFeeId: string;
  showAmounts: boolean;
};

const StudentFeePaymentsHistory = ({
  studentFeeId,
  showAmounts,
}: StudentFeePaymentsHistoryProps) => {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = usePayments(studentFeeId);

  const rows: StudentFeePaymentRow[] = data?.data ?? [];

  return (
    <div className="flex flex-col gap-1 text-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="underline text-lamaPurple disabled:opacity-60 text-xs text-left"
      >
        {open ? "Hide history" : "View history"}
      </button>
      {open && (
        <div className="mt-1 p-2 rounded-md border border-gray-200 bg-slate-50 max-h-40 overflow-y-auto min-w-[180px]">
          {isLoading && <div className="text-gray-500">Loading...</div>}
          {error && <div className="text-red-500">Error loading payments</div>}
          {!isLoading && !error && rows.length === 0 && (
            <div className="text-gray-500">No payments yet</div>
          )}
          {!isLoading && !error && rows.length > 0 && (
            <ul className="space-y-1">
              {rows.map((p) => {
                const paidDate = new Date(p.paidAt).toLocaleDateString();
                return (
                  <li key={p.id} className="flex flex-col">
                    {showAmounts && (
                      <span className="font-medium">{formatKES(p.amount)}</span>
                    )}
                    <span className="text-[10px] text-gray-600">
                      {showAmounts ? p.method : "Payment"} {"\u00b7"} {paidDate}
                    </span>
                    {showAmounts && p.reference && (
                      <span className="text-[10px] text-gray-500">Ref: {p.reference}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentFeePaymentsHistory;

