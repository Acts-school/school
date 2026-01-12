"use client";

import { useForm } from "react-hook-form";
import { useActionState, useEffect } from "react";
import { createInvoice, type CreateInvoiceInput } from "@/lib/fees.actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function InvoiceForm() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateInvoiceInput>({
    defaultValues: { studentId: "", term: "TERM1", dueDate: "", totalAmountMinor: 0 },
  });

  const [state, formAction] = useActionState(createInvoice, { success: false, error: false });

  useEffect(() => {
    if (state.success) {
      toast("Invoice created");
      router.refresh();
    }
  }, [state, router]);

  const onSubmit = handleSubmit((data) => {
    const minor = Math.round(Number(data.totalAmountMinor) * 100);
    formAction({ ...data, totalAmountMinor: minor });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col w-full md:w-1/3">
        <label className="text-xs text-gray-500">Student ID</label>
        <input className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("studentId", { required: true })} />
        {errors.studentId && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/5">
        <label className="text-xs text-gray-500">Term</label>
        <select className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("term", { required: true })}>
          <option value="TERM1">Term 1</option>
          <option value="TERM2">Term 2</option>
          <option value="TERM3">Term 3</option>
        </select>
      </div>
      <div className="flex flex-col w-full md:w-1/5">
        <label className="text-xs text-gray-500">Due Date</label>
        <input type="date" className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("dueDate", { required: true })} />
        {errors.dueDate && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/5">
        <label className="text-xs text-gray-500">Total (KES)</label>
        <input type="number" step="0.01" className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("totalAmountMinor", { required: true, min: 0, valueAsNumber: true })} />
        {errors.totalAmountMinor && <span className="text-xs text-red-500">Required</span>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-500 text-white px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Creating..." : "Create Invoice"}
      </button>
    </form>
  );
}
