"use client";

import { useActionState } from "react";
import { sendBulkFeeReminders, type SendBulkFeeRemindersState } from "@/lib/fees.actions";

const initialState: SendBulkFeeRemindersState = { success: false, error: false };

interface BulkClearanceReminderButtonProps {
  year: number;
  gradeId?: string | undefined;
  classId?: string | undefined;
}

const BulkClearanceReminderButton = ({
  year,
  gradeId,
  classId,
}: BulkClearanceReminderButtonProps) => {
  const [state, formAction] = useActionState(sendBulkFeeReminders, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="year" value={String(year)} />
      {gradeId ? <input type="hidden" name="gradeId" value={gradeId} /> : null}
      {classId ? <input type="hidden" name="classId" value={classId} /> : null}
      <button
        type="submit"
        className="px-3 py-2 text-xs md:text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
      >
        Send reminders to listed parents
      </button>
      {state.message && (
        <p className={`text-[11px] ${state.error ? "text-red-600" : "text-green-600"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
};

export default BulkClearanceReminderButton;
