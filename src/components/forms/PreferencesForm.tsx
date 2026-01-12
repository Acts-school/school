"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { userPreferencesSchema, type UserPreferencesSchema } from "@/lib/formValidationSchemas";
import { updateUserPreferences } from "@/lib/actions";

export type PreferencesFormInput = UserPreferencesSchema;

type PreferencesFormProps = {
  initialData: PreferencesFormInput;
};

const PreferencesForm = ({ initialData }: PreferencesFormProps) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserPreferencesSchema>({
    resolver: zodResolver(userPreferencesSchema),
    defaultValues: initialData,
  });

  const [state, formAction] = useActionState(updateUserPreferences, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((values) => {
    formAction(values);
  });

  useEffect(() => {
    if (state.success) {
      toast("Preferences updated");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2 w-full md:w-1/3">
        <label className="text-xs text-gray-500">Theme</label>
        <select
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          {...register("theme")}
          defaultValue={initialData.theme}
        >
          <option value="system">System default</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        {errors.theme?.message && (
          <p className="text-xs text-red-400">{errors.theme.message}</p>
        )}
      </div>
      {state.error && (
        <span className="text-red-500 text-sm">Something went wrong!</span>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed self-start"
      >
        {isSubmitting ? "Saving..." : "Save Preferences"}
      </button>
    </form>
  );
};

export default PreferencesForm;
