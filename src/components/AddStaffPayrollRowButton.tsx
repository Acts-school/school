"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  createStaffPayrollRow,
  type CreateStaffPayrollRowInput,
  type PayrollPeriodStatus,
  type StaffRole,
} from "@/lib/payroll.actions";

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
};

type AddStaffPayrollRowButtonProps = {
  periodId: number;
  periodStatus: PayrollPeriodStatus;
  availableStaff: StaffOption[];
};

export default function AddStaffPayrollRowButton({
  periodId,
  periodStatus,
  availableStaff,
}: AddStaffPayrollRowButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  type AddRowActionState = {
    success: boolean;
    error: boolean;
    message?: string;
  };

  type AddRowAction = (
    state: AddRowActionState,
    payload: CreateStaffPayrollRowInput,
  ) => Promise<AddRowActionState>;

  const [state, formAction] = useActionState<AddRowActionState, CreateStaffPayrollRowInput>(
    createStaffPayrollRow as unknown as AddRowAction,
    {
      success: false,
      error: false,
    },
  );

  useEffect(() => {
    if (state.success) {
      toast("Staff payroll row added");
      setIsOpen(false);
      setSelectedStaffId("");
      router.refresh();
    }
    if (state.error) {
      toast.error(state.message ?? "Could not add staff payroll row");
    }
  }, [state, router]);

  if (periodStatus !== "OPEN" || availableStaff.length === 0) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedStaffId) {
      return;
    }

    const payload: CreateStaffPayrollRowInput = {
      periodId,
      staffId: selectedStaffId,
    };

    formAction(payload);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add row
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-row gap-2 items-center">
      <select
        value={selectedStaffId}
        onChange={(event) => setSelectedStaffId(event.target.value)}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm min-w-[200px]"
      >
        <option value="">Select staff...</option>
        {availableStaff.map((staff) => (
          <option key={staff.id} value={staff.id}>
            {staff.firstName} {staff.lastName} ({staff.role})
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="px-3 py-2 text-sm rounded-md bg-gray-200 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
    </form>
  );
}
