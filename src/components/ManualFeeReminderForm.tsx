"use client";

import { useActionState } from "react";
import { sendFeeReminder, type SendFeeReminderState } from "@/lib/fees.actions";

const initialState: SendFeeReminderState = { success: false, error: false };

export default function ManualFeeReminderForm() {
  const [state, formAction] = useActionState(sendFeeReminder, initialState);

  return (
    <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Manual Fee Reminder (SMS)</h2>
      <p className="text-xs text-gray-600">
        Send an SMS reminder to a parent for a specific student fee row by its ID. Use with care.
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
        <button
          type="submit"
          className="mt-2 inline-flex items-center justify-center px-3 py-2 rounded-md bg-green-500 text-white text-xs hover:bg-green-600 disabled:opacity-50"
        >
          Send reminder SMS
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
