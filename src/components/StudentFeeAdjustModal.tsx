"use client";

import { useActionState, useEffect } from "react";
import { adjustStudentFee, type AdjustStudentFeeState } from "@/lib/fees.actions";

const initialState: AdjustStudentFeeState = { success: false, error: false };

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

export type StudentFeeAdjustModalProps = {
  open: boolean;
  onClose: () => void;
  studentFeeId: string;
  currentAmountMinor: number;
  onAdjusted?: () => void;
};

const StudentFeeAdjustModal = ({
  open,
  onClose,
  studentFeeId,
  currentAmountMinor,
  onAdjusted,
}: StudentFeeAdjustModalProps) => {
  const [state, formAction] = useActionState(adjustStudentFee, initialState);

  useEffect(() => {
    if (state.success && !state.error) {
      if (typeof onAdjusted === "function") {
        onAdjusted();
      }
      onClose();
    }
  }, [state.success, state.error, onClose, onAdjusted]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md p-4 w-full max-w-sm shadow-lg text-xs">
        <h2 className="text-sm font-semibold mb-2">Adjust fee amount</h2>
        <p className="text-[11px] text-gray-600 mb-2">
          Current amount: <span className="font-semibold">{formatKES(currentAmountMinor)}</span>
        </p>
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="studentFeeId" value={studentFeeId} />
          <div className="flex flex-col gap-1">
            <label htmlFor="newAmountKes" className="text-gray-600">
              New amount (KES)
            </label>
            <input
              id="newAmountKes"
              name="newAmountKes"
              type="number"
              step="0.01"
              min={0}
              defaultValue={(currentAmountMinor / 100).toFixed(2)}
              className="p-2 rounded-md ring-1 ring-gray-300 text-xs"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="discountReason" className="text-gray-600">
              Reason (optional)
            </label>
            <input
              id="discountReason"
              name="discountReason"
              type="text"
              className="p-2 rounded-md ring-1 ring-gray-300 text-xs"
              placeholder="e.g. sibling discount, hardship"
            />
          </div>
          {state.message && (
            <p
              className={`mt-1 ${state.error ? "text-red-600" : "text-green-600"}`}
            >
              {state.message}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md bg-lamaPurple text-white hover:bg-purple-700 disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentFeeAdjustModal;

