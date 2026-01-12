"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { updateStaffPayroll, type UpdateStaffPayrollInput, type PayrollStatus } from "@/lib/payroll.actions";
import type { PaymentMethod } from "@/lib/fees.actions";

const paymentMethods: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "POS", "ONLINE"];
const payrollStatuses: PayrollStatus[] = ["DRAFT", "APPROVED", "PAID"];

export type StaffPayrollRowFormProps = {
  id: number;
  basicSalaryMinor: number;
  allowancesMinor: number;
  deductionsMinor: number;
  status: PayrollStatus;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  paidAtIso: string | null;
};

export default function StaffPayrollRowForm({
  id,
  basicSalaryMinor,
  allowancesMinor,
  deductionsMinor,
  status,
  paymentMethod,
  paymentReference,
  paidAtIso,
}: StaffPayrollRowFormProps) {
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UpdateStaffPayrollInput>({
    defaultValues: {
      id,
      basicSalaryMinor: basicSalaryMinor / 100,
      allowancesMinor: allowancesMinor / 100,
      deductionsMinor: deductionsMinor / 100,
      status,
      notes: "",
      paymentMethod: paymentMethod ?? undefined,
      paymentReference: paymentReference ?? "",
      paidAt: paidAtIso ?? "",
    },
  });

  const [state, formAction] = useActionState(updateStaffPayroll, { success: false, error: false });

  useEffect(() => {
    if (state.success) {
      toast("Payroll row updated");
      router.refresh();
    }
    if (state.error) {
      toast.error("Error updating payroll row");
    }
  }, [state, router]);

  const onSubmit = handleSubmit((data) => {
    const payload: UpdateStaffPayrollInput = {
      id,
      basicSalaryMinor: Math.round(Number(data.basicSalaryMinor) * 100),
      allowancesMinor: Math.round(Number(data.allowancesMinor) * 100),
      deductionsMinor: Math.round(Number(data.deductionsMinor) * 100),
      status: data.status,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      paymentReference: data.paymentReference,
      paidAt: data.paidAt,
    };

    formAction(payload);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1 text-xs">
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-col w-20">
          <label className="text-[10px] text-gray-500">Basic (KES)</label>
          <input
            type="number"
            step="0.01"
            className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-[11px]"
            {...register("basicSalaryMinor", { required: true, min: 0, valueAsNumber: true })}
          />
          {errors.basicSalaryMinor && (
            <span className="text-[10px] text-red-500">Required</span>
          )}
        </div>
        <div className="flex flex-col w-20">
          <label className="text-[10px] text-gray-500">Allow (KES)</label>
          <input
            type="number"
            step="0.01"
            className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-[11px]"
            {...register("allowancesMinor", { required: true, min: 0, valueAsNumber: true })}
          />
          {errors.allowancesMinor && (
            <span className="text-[10px] text-red-500">Required</span>
          )}
        </div>
        <div className="flex flex-col w-20">
          <label className="text-[10px] text-gray-500">Ded (KES)</label>
          <input
            type="number"
            step="0.01"
            className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-[11px]"
            {...register("deductionsMinor", { required: true, min: 0, valueAsNumber: true })}
          />
          {errors.deductionsMinor && (
            <span className="text-[10px] text-red-500">Required</span>
          )}
        </div>
        <div className="flex flex-col w-24">
          <label className="text-[10px] text-gray-500">Status</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-[11px]"
            {...register("status", { required: true })}
          >
            {payrollStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col w-28">
          <label className="text-[10px] text-gray-500">Method</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-[11px]"
            {...register("paymentMethod")}
          >
            <option value="">-</option>
            {paymentMethods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-1 items-end">
        <div className="flex flex-col w-32">
          <label className="text-[10px] text-gray-500">Paid At</label>
          <input
            type="datetime-local"
            className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-[11px]"
            {...register("paidAt")}
          />
        </div>
        <div className="flex flex-col flex-1 min-w-[120px]">
          <label className="text-[10px] text-gray-500">Notes</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-[11px]"
            {...register("notes")}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="ml-auto bg-lamaPurple text-white px-3 py-1 rounded-md text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
