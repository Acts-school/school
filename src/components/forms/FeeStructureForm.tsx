"use client";

import { useForm } from "react-hook-form";
import { useActionState, useEffect } from "react";
import { createFeeStructure, type CreateFeeStructureInput } from "@/lib/fees.actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function FeeStructureForm() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateFeeStructureInput>({
    defaultValues: { name: "", amountMinor: 0, active: true },
  });

  const [state, formAction] = useActionState(createFeeStructure, { success: false, error: false });

  useEffect(() => {
    if (state.success) {
      toast("Fee item created");
      router.refresh();
    }
  }, [state, router]);

  const onSubmit = handleSubmit((data) => {
    // amountMinor expects minor units; treat input as KES and convert
    const minor = Math.round(Number(data.amountMinor) * 100);
    formAction({ ...data, amountMinor: minor });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col w-full md:w-1/3">
        <label className="text-xs text-gray-500">Name</label>
        <input className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("name", { required: true })} />
        {errors.name && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Amount (KES)</label>
        <input
          type="number"
          step="0.01"
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
          {...register("amountMinor", { required: true, min: 0, valueAsNumber: true })}
          onChange={(e) => {
            const v = Number(e.currentTarget.value || 0);
            // convert KES to minor units in-place: show KES input but store minor units
            e.currentTarget.value = String(v);
          }}
        />
        {errors.amountMinor && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Grade (optional)</label>
        <input type="number" className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("gradeId", { valueAsNumber: true })} />
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto">
        <input type="checkbox" defaultChecked {...register("active")} />
        <label className="text-xs text-gray-500">Active</label>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-500 text-white px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Saving..." : "Add Fee"}
      </button>
    </form>
  );
}
