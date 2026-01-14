"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  createStageFeeDefinitionAndApply,
  type CreateStageFeeDefinitionInput,
  type CreateStageFeeDefinitionState,
  type StageGroup,
  type SimpleFeeFrequency,
  type Term,
} from "@/lib/fees.actions";

type SimpleStageFeeFormValues = {
  feeName: string;
  amountKes: number;
  frequency: SimpleFeeFrequency;
  stageGroup: StageGroup;
  academicYear: number;
  term?: Term;
};

const defaultState: CreateStageFeeDefinitionState = {
  success: false,
  error: false,
};

export default function SimpleStageFeeForm() {
  const router = useRouter();
  const now = new Date();
  const currentYear = now.getFullYear();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SimpleStageFeeFormValues>({
    defaultValues: {
      feeName: "",
      amountKes: 0,
      frequency: "TERMLY",
      stageGroup: "PRIMARY",
      academicYear: currentYear,
      term: "TERM1",
    },
  });

  const [state, formAction] = useActionState(createStageFeeDefinitionAndApply, defaultState);

  const selectedFrequency = watch("frequency");

  useEffect(() => {
    if (state.success) {
      toast(state.message ?? "Stage-based fee created");
      router.refresh();
      reset({
        feeName: "",
        amountKes: 0,
        frequency: "TERMLY",
        stageGroup: "PRIMARY",
        academicYear: currentYear,
        term: "TERM1",
      });
    } else if (state.error && state.message) {
      toast(state.message);
    }
  }, [state, router, reset, currentYear]);

  const onSubmit = handleSubmit((values) => {
    const minor = Math.round(Number(values.amountKes) * 100);

    const payload: CreateStageFeeDefinitionInput = {
      feeName: values.feeName,
      amountMinor: minor,
      frequency: values.frequency,
      stageGroup: values.stageGroup,
      academicYear: Number(values.academicYear),
      ...(values.frequency === "TERMLY" && values.term ? { term: values.term } : {}),
    };

    formAction(payload);
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Simple Stage-based Fee Creation</h2>
      </div>
      <form onSubmit={onSubmit} className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col w-full md:w-1/3">
          <label className="text-xs text-gray-500">Fee name</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            {...register("feeName", { required: true })}
          />
          {errors.feeName && <span className="text-xs text-red-500">Required</span>}
        </div>

        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Amount (KES)</label>
          <input
            type="number"
            step="0.01"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            {...register("amountKes", { required: true, min: 0, valueAsNumber: true })}
          />
          {errors.amountKes && <span className="text-xs text-red-500">Required</span>}
        </div>

        <div className="flex flex-col w-full md:w-1/5">
          <label className="text-xs text-gray-500">Frequency</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            {...register("frequency", { required: true })}
          >
            <option value="TERMLY">Termly</option>
            <option value="YEARLY">Yearly</option>
            <option value="ONE_TIME">One-time</option>
          </select>
        </div>

        {selectedFrequency === "TERMLY" && (
          <div className="flex flex-col w-full md:w-1/5">
            <label className="text-xs text-gray-500">Term</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
              {...register("term")}
            >
              <option value="TERM1">TERM1</option>
              <option value="TERM2">TERM2</option>
              <option value="TERM3">TERM3</option>
            </select>
          </div>
        )}

        <div className="flex flex-col w-full md:w-1/5">
          <label className="text-xs text-gray-500">Stage group</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            {...register("stageGroup", { required: true })}
          >
            <option value="ECDE">ECDE (PP1–PP2)</option>
            <option value="PRIMARY">Primary (Grade 1–6)</option>
            <option value="JSS">Junior Secondary (Grade 7–9)</option>
          </select>
        </div>

        <div className="flex flex-col w-full md:w-1/6">
          <label className="text-xs text-gray-500">Academic year</label>
          <input
            type="number"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            {...register("academicYear", { required: true, valueAsNumber: true })}
          />
          {errors.academicYear && <span className="text-xs text-red-500">Required</span>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 text-white px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
       >
          {isSubmitting ? "Saving..." : "Add & Apply"}
        </button>
      </form>
    </div>
  );
}
