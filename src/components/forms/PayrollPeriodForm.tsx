"use client";

import { useForm } from "react-hook-form";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createPayrollPeriod, type CreatePayrollPeriodInput } from "@/lib/payroll.actions";

const getCurrentYearMonth = () => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

export default function PayrollPeriodForm() {
  const router = useRouter();
  const { year, month } = getCurrentYearMonth();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreatePayrollPeriodInput>({
    defaultValues: { year, month },
  });

  const [state, formAction] = useActionState(createPayrollPeriod, { success: false, error: false });

  useEffect(() => {
    if (state.success) {
      toast("Payroll period created");
      router.refresh();
    }
  }, [state, router]);

  const onSubmit = handleSubmit((data) => {
    const parsedYear = Number(data.year);
    const parsedMonth = Number(data.month);

    if (!Number.isFinite(parsedYear) || !Number.isFinite(parsedMonth)) {
      return;
    }

    formAction({ year: parsedYear, month: parsedMonth });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Year</label>
        <input
          type="number"
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
          {...register("year", { required: true, min: 2000 })}
        />
        {errors.year && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Month</label>
        <input
          type="number"
          min={1}
          max={12}
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
          {...register("month", { required: true, min: 1, max: 12 })}
        />
        {errors.month && <span className="text-xs text-red-500">Required</span>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-500 text-white px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Creating..." : "Create Period"}
      </button>
    </form>
  );
}
