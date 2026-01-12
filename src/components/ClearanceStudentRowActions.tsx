"use client";

import { useState } from "react";
import ClearanceStudentPaymentModal from "@/components/ClearanceStudentPaymentModal";

export type ClearanceStudentRowActionsProps = {
  studentId: string;
  year: number;
};

const ClearanceStudentRowActions = ({ studentId, year }: ClearanceStudentRowActionsProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="px-2 py-1 rounded-md border text-[11px] hover:bg-gray-50"
        onClick={() => {
          setOpen(true);
        }}
      >
        Record payment
      </button>
      <ClearanceStudentPaymentModal
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        studentId={studentId}
        year={year}
      />
    </>
  );
};

export default ClearanceStudentRowActions;
