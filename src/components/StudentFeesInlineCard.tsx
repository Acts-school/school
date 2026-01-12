"use client";

import { useState } from "react";
import Link from "next/link";
import type { TermLiteral } from "@/lib/schoolSettings";
import { useStudentFeesByStudent, type StudentFeesByStudentItem } from "@/hooks/useStudentFeesByStudent";
import StudentFeePaymentFormInline from "@/components/StudentFeePaymentFormInline";
import StudentFeeAdjustModal from "@/components/StudentFeeAdjustModal";
import StudentFeeReminderButton from "@/components/StudentFeeReminderButton";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

export type StudentFeesInlineCardProps = {
  studentId: string;
  initialTerm: TermLiteral;
  initialYear: number;
  canEdit: boolean;
};

const StudentFeesInlineCard = ({
  studentId,
  initialTerm,
  initialYear,
  canEdit,
}: StudentFeesInlineCardProps) => {
  const [termFilter, setTermFilter] = useState<"" | TermLiteral>(initialTerm);
  const [year, setYear] = useState<number>(initialYear);
  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);

  const query = useStudentFeesByStudent({
    studentId,
    ...(termFilter ? { term: termFilter } : {}),
    ...(Number.isFinite(year) ? { year } : {}),
  });

  const feesSource = query.data?.data;
  const fees: ReadonlyArray<StudentFeesByStudentItem> = Array.isArray(feesSource)
    ? feesSource
    : [];

  const selectedFee =
    selectedFeeId !== null ? fees.find((fee) => fee.id === selectedFeeId) ?? null : null;

  const totals = fees.reduce(
    (acc, fee) => {
      const outstanding = Math.max(fee.amountDue - fee.amountPaid, 0);
      return {
        due: acc.due + fee.amountDue,
        paid: acc.paid + fee.amountPaid,
        outstanding: acc.outstanding + outstanding,
      };
    },
    { due: 0, paid: 0, outstanding: 0 },
  );

  const isLoading = query.isLoading;
  const error = query.error;

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-md">
        <h1 className="text-xl font-semibold mb-2">Current term fees</h1>
        <p className="text-xs text-gray-500">Loading fees</p>
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Failed to load fees";
    return (
      <div className="bg-white p-4 rounded-md">
        <h1 className="text-xl font-semibold mb-2">Current term fees</h1>
        <p className="text-xs text-red-600">{message}</p>
      </div>
    );
  }

  if (fees.length === 0) {
    return (
      <div className="bg-white p-4 rounded-md">
        <h1 className="text-xl font-semibold mb-2">Current term fees</h1>
        <p className="text-xs text-gray-500">
          No fees found for the current term.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div>
          <h1 className="text-xl font-semibold">Current term fees</h1>
          <p className="text-xs text-gray-500">
            {termFilter || "All terms"} · {year} · Outstanding: {formatKES(totals.outstanding)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-500" htmlFor="fees-year-input">
              Year
            </label>
            <input
              id="fees-year-input"
              type="number"
              className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-[11px] w-20"
              value={Number.isFinite(year) ? year : ""}
              onChange={(e) => {
                const next = Number(e.target.value);
                setYear(Number.isFinite(next) ? next : initialYear);
              }}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-500" htmlFor="fees-term-select">
              Term
            </label>
            <select
              id="fees-term-select"
              className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-[11px] w-24"
              value={termFilter}
              onChange={(e) => {
                const value = e.target.value as "" | TermLiteral;
                setTermFilter(value);
              }}
            >
              <option value="">All</option>
              <option value="TERM1">TERM1</option>
              <option value="TERM2">TERM2</option>
              <option value="TERM3">TERM3</option>
            </select>
          </div>
          {(() => {
            const params = new URLSearchParams();
            params.set("year", String(year));
            if (termFilter) params.set("term", termFilter);
            const detailsHref = `/finance/students/${studentId}/fees?${params.toString()}`;
            return (
              <Link
                href={detailsHref}
                className="text-[11px] text-blue-600 hover:underline mt-4"
              >
                View details
              </Link>
            );
          })()}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1 pr-3">Fee</th>
              <th className="py-1 pr-3">Due</th>
              <th className="py-1 pr-3">Paid</th>
              <th className="py-1 pr-3">Outstanding</th>
              <th className="py-1 pr-3">Status</th>
              <th className="py-1 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => {
              const outstanding = Math.max(fee.amountDue - fee.amountPaid, 0);
              return (
                <tr key={fee.id} className="border-b last:border-b-0 align-top">
                  <td className="py-1 pr-3">
                    {fee.name ?? "-"}
                  </td>
                  <td className="py-1 pr-3">{formatKES(fee.amountDue)}</td>
                  <td className="py-1 pr-3">{formatKES(fee.amountPaid)}</td>
                  <td className="py-1 pr-3">{formatKES(outstanding)}</td>
                  <td className="py-1 pr-3 uppercase">{fee.status}</td>
                  <td className="py-1 pr-3">
                    {canEdit ? (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          className="px-2 py-1 rounded-md border text-[11px] hover:bg-gray-50 self-start"
                          onClick={() => {
                            setSelectedFeeId(fee.id);
                          }}
                        >
                          Adjust amount
                        </button>
                        {outstanding > 0 ? (
                          <>
                            <StudentFeePaymentFormInline
                              studentFeeId={fee.id}
                              outstandingMinor={outstanding}
                            />
                            <StudentFeeReminderButton studentFeeId={fee.id} />
                          </>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            No outstanding balance
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400">No actions available</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedFee ? (
        <StudentFeeAdjustModal
          key={selectedFee.id}
          open
          onClose={() => {
            setSelectedFeeId(null);
          }}
          studentFeeId={selectedFee.id}
          currentAmountMinor={selectedFee.amountDue}
          onAdjusted={() => {
            void query.refetch();
          }}
        />
      ) : null}
    </div>
  );
};

export default StudentFeesInlineCard;

