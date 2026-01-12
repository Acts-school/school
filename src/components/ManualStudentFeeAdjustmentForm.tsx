"use client";

import { useActionState } from "react";
import { adjustStudentFee, type AdjustStudentFeeState } from "@/lib/fees.actions";

const initialState: AdjustStudentFeeState = { success: false, error: false };

export default function ManualStudentFeeAdjustmentForm() {
  const [state, formAction] = useActionState(adjustStudentFee, initialState);

  return (
    <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Manual Student Fee Adjustment</h2>
      <p className="text-xs text-gray-600">
        Advanced tool: set a final agreed amount for a specific student fee row by its ID. Use with care.
      </p>
      <form action={formAction} className="flex flex-col gap-2 text-xs">
        <div className="flex flex-col gap-1">
          <label htmlFor="studentFeeId" className="text-gray-600">
            StudentFee ID
          </label>
          <input
            id="studentFeeId"
            name="studentFeeId"
            type="text"
            className="p-2 rounded-md ring-1 ring-gray-300 text-xs"
            placeholder="sf_... (StudentFee.id)"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="newAmountKes" className="text-gray-600">
            Final agreed amount (KES)
          </label>
          <input
            id="newAmountKes"
            name="newAmountKes"
            type="number"
            step="0.01"
            min={0}
            className="p-2 rounded-md ring-1 ring-gray-300 text-xs"
            placeholder="e.g. 15000"
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
        <button
          type="submit"
          className="mt-2 inline-flex items-center justify-center px-3 py-2 rounded-md bg-blue-500 text-white text-xs hover:bg-blue-600 disabled:opacity-50"
        >
          Apply adjustment
        </button>
        {state.message && (
          <p
            className={`text-xs mt-1 ${state.error ? "text-red-600" : "text-green-600"}`}
          >
            {state.message}
          </p>
        )}
      </form>
    </div>
  );
}
