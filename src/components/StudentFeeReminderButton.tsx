"use client";

import { useActionState } from "react";
import { sendFeeReminder, type SendFeeReminderState } from "@/lib/fees.actions";

const initialState: SendFeeReminderState = { success: false, error: false };

interface StudentFeeReminderButtonProps {
  studentFeeId: string;
}

const StudentFeeReminderButton = ({ studentFeeId }: StudentFeeReminderButtonProps) => {
  const [state, formAction] = useActionState(sendFeeReminder, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-1 text-[11px] mt-1">
      <input type="hidden" name="studentFeeId" value={studentFeeId} />
      <button
        type="submit"
        className="px-2 py-1 rounded-md border border-green-500 text-green-700 hover:bg-green-50 self-start"
      >
        Send reminder
      </button>
      {state.message && (
        <p className={state.error ? "text-red-600" : "text-green-600"}>{state.message}</p>
      )}
    </form>
  );
};

export default StudentFeeReminderButton;
