"use client";

import { useMemo, useState } from "react";
import { useStudentFeesByStudent, type StudentFeesByStudentItem } from "@/hooks/useStudentFeesByStudent";

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

type PaymentMethodLiteral = "CASH" | "BANK_TRANSFER" | "POS" | "ONLINE" | "MPESA";

export type ClearanceStudentPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  studentId: string;
  year: number;
  term: TermLiteral | null;
};

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

const ClearanceStudentPaymentModal = ({
  open,
  onClose,
  studentId,
  year,
  term,
}: ClearanceStudentPaymentModalProps) => {
  const query = useStudentFeesByStudent({
    studentId,
    year,
    ...(term ? { term } : {}),
  });

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

  const [method, setMethod] = useState<PaymentMethodLiteral>("CASH");
  const [reference, setReference] = useState("");
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!open) return null;

  const isLoading = query.isLoading;
  const error = query.error;

  const handleAllocationChange = (feeId: string, value: string) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    const trimmed = value.trim();
    if (trimmed === "") {
      setAllocations((prev) => {
        const next = { ...prev };
        delete next[feeId];
        return next;
      });
      return;
    }

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }

    setAllocations((prev) => ({ ...prev, [feeId]: parsed }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const effectiveAllocations = Object.entries(allocations)
      .filter(([, amount]) => amount > 0)
      .map(([studentFeeId, amount]) => ({ studentFeeId, amount }));

    if (effectiveAllocations.length === 0) {
      setErrorMessage("Enter at least one allocation amount.");
      return;
    }

    if (method !== "CASH" && reference.trim() === "") {
      setErrorMessage("Reference is required for non-cash payments.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/payments/multi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          method,
          reference: reference.trim() || undefined,
          allocations: effectiveAllocations,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as { error: unknown }).error ?? "Failed to record payment.")
            : "Failed to record payment.";
        setErrorMessage(message);
        return;
      }

      setSuccessMessage("Payment recorded successfully.");
      setAllocations({});
      setReference("");
      await query.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to record payment.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className="mb-2 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-700">Method:</label>
            <select
              className="border rounded px-1 py-0.5 text-[11px]"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value as PaymentMethodLiteral);
                setSuccessMessage(null);
                setErrorMessage(null);
              }}
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="POS">POS</option>
              <option value="ONLINE">Online</option>
              <option value="MPESA">M-Pesa</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-700">Reference:</label>
            <input
              type="text"
              className="flex-1 border rounded px-1 py-0.5 text-[11px]"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                setSuccessMessage(null);
                setErrorMessage(null);
              }}
              placeholder={method === "CASH" ? "Optional for cash payments" : "Required for this method"}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save payment"}
            </button>
            {successMessage && (
              <span className="text-[11px] text-green-600">{successMessage}</span>
            )}
            {errorMessage && !successMessage && (
              <span className="text-[11px] text-red-600">{errorMessage}</span>
            )}
          </div>
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
              const allocationValue = allocations[fee.id] ?? 0;
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
                    <div className="mt-1 flex items-center gap-2">
                      <label className="text-[11px] text-gray-700" htmlFor={`allocation-${fee.id}`}>
                        Amount to allocate:
                      </label>
                      <input
                        id={`allocation-${fee.id}`}
                        type="number"
                        min={0}
                        step="0.01"
                        className="flex-1 border rounded px-1 py-0.5 text-[11px]"
                        value={allocationValue === 0 ? "" : String(allocationValue)}
                        onChange={(e) => handleAllocationChange(fee.id, e.target.value)}
                        placeholder={(outstanding / 100).toFixed(2)}
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
