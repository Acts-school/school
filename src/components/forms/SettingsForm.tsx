"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import InputField from "../InputField";
import {
  schoolSettingsSchema,
  type SchoolSettingsSchema,
} from "@/lib/formValidationSchemas";
import { updateSchoolSettings } from "@/lib/actions";

export type SettingsFormInput = SchoolSettingsSchema;

type SettingsFormProps = {
  initialData: SettingsFormInput;
};

const SettingsForm = ({ initialData }: SettingsFormProps) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SchoolSettingsSchema>({
    resolver: zodResolver(schoolSettingsSchema),
    defaultValues: {
      schoolName: initialData.schoolName,
      currentAcademicYear: initialData.currentAcademicYear,
      currentTerm: initialData.currentTerm,
      passingScore: initialData.passingScore,
    },
  });

  const [state, formAction] = useActionState(updateSchoolSettings, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((values) => {
    formAction(values);
  });

  useEffect(() => {
    if (state.success) {
      toast("Settings updated");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <div className="flex flex-wrap gap-4">
        <InputField
          label="School Name"
          name="schoolName"
          defaultValue={initialData.schoolName}
          register={register}
          error={errors.schoolName}
        />
        <InputField
          label="Current Academic Year"
          name="currentAcademicYear"
          defaultValue={String(initialData.currentAcademicYear)}
          register={register}
          error={errors.currentAcademicYear}
          inputProps={{ inputMode: "numeric" }}
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Current Term</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("currentTerm")}
            defaultValue={initialData.currentTerm}
          >
            <option value="TERM1">Term 1</option>
            <option value="TERM2">Term 2</option>
            <option value="TERM3">Term 3</option>
          </select>
          {errors.currentTerm?.message && (
            <p className="text-xs text-red-400">{errors.currentTerm.message}</p>
          )}
        </div>
        <InputField
          label="Passing Score (%)"
          name="passingScore"
          defaultValue={
            typeof initialData.passingScore === "number"
              ? String(initialData.passingScore)
              : ""
          }
          register={register}
          error={errors.passingScore}
          inputProps={{ inputMode: "numeric" }}
        />
      </div>
      {state.error && (
        <span className="text-red-500 text-sm">Something went wrong!</span>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed self-start"
      >
        {isSubmitting ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
};

export default SettingsForm;
