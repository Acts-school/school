"use client";

import { useMemo } from "react";
import StudentFeePaymentFormInline from "@/components/StudentFeePaymentFormInline";
import { useStudentFeesByStudent, type StudentFeesByStudentItem } from "@/hooks/useStudentFeesByStudent";

export type ClearanceStudentPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  studentId: string;
  year: number;
};

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

const ClearanceStudentPaymentModal = ({
  open,
  onClose,
  studentId,
  year,
}: ClearanceStudentPaymentModalProps) => {
  const query = useStudentFeesByStudent({ studentId, year });

  const fees: ReadonlyArray<StudentFeesByStudentItem> = useMemo(() => {
    const source = query.data?.data;
    return Array.isArray(source) ? source : [];
  }, [query.data]);

  const totals = useMemo(
    () =>
      fees.reduce(
        (acc, fee) => {
          const outstanding = Math.max(fee.amountDue - fee.amountPaid, 0);
          return {
            due: acc.due + fee.amountDue,
            paid: acc.paid + fee.amountPaid,
            outstanding: acc.outstanding + outstanding,
          };
        },
        { due: 0, paid: 0, outstanding: 0 },
      ),
    [fees],
  );

  if (!open) return null;

  const isLoading = query.isLoading;
  const error = query.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md p-4 w-full max-w-lg shadow-lg text-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold">Record payment</h2>
            <p className="text-[11px] text-gray-600">
              Outstanding fees for {year}. Total outstanding: {formatKES(totals.outstanding)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>

        {isLoading ? (
          <p className="text-[11px] text-gray-500">Loading fees...</p>
        ) : error ? (
          <p className="text-[11px] text-red-600">Failed to load fees.</p>
        ) : fees.length === 0 ? (
          <p className="text-[11px] text-gray-500">No fees found for this student in {year}.</p>
        ) : (
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
            {fees.map((fee) => {
              const outstanding = Math.max(fee.amountDue - fee.amountPaid, 0);
              return (
                <div key={fee.id} className="border rounded-md p-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium text-[11px]">{fee.name ?? "Fee"}</span>
                      <span className="text-[11px] text-gray-500">
                        Due: {formatKES(fee.amountDue)} · Paid: {formatKES(fee.amountPaid)}
                      </span>
                    </div>
                    <div className="text-right text-[11px]">
                      <span className="block">Outstanding</span>
                      <span className="font-semibold">{formatKES(outstanding)}</span>
                    </div>
                  </div>
                  {outstanding > 0 ? (
                    <div className="mt-1">
                      <StudentFeePaymentFormInline
                        studentFeeId={fee.id}
                        outstandingMinor={outstanding}
                      />
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400">No outstanding balance</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClearanceStudentPaymentModal;
