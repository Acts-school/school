"use client";

import { useForm } from "react-hook-form";
import { useActionState, useEffect } from "react";
import { createExpense, type CreateExpenseInput } from "@/lib/fees.actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function ExpenseForm() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateExpenseInput>({
    defaultValues: { title: "", amountMinor: 0, category: "", notes: "" },
  });

  const [state, formAction] = useActionState(createExpense, { success: false, error: false });

  useEffect(() => {
    if (state.success) {
      toast("Expense created");
      router.refresh();
    }
  }, [state, router]);

  const onSubmit = handleSubmit((data) => {
    const minor = Math.round(Number(data.amountMinor) * 100);
    formAction({ ...data, amountMinor: minor });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col w-full md:w-1/3">
        <label className="text-xs text-gray-500">Title</label>
        <input className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("title", { required: true })} />
        {errors.title && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Amount (KES)</label>
        <input type="number" step="0.01" className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("amountMinor", { required: true, min: 0, valueAsNumber: true })} />
        {errors.amountMinor && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Category</label>
        <input className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("category", { required: true })} />
        {errors.category && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Date (optional)</label>
        <input type="date" className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("date")} />
      </div>
      <div className="flex flex-col w-full md:w-1/2">
        <label className="text-xs text-gray-500">Notes (optional)</label>
        <input className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("notes")} />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-500 text-white px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Saving..." : "Add Expense"}
      </button>
    </form>
  );
}
