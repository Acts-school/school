"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import InputField from "../InputField";
import { changePasswordSchema, type ChangePasswordSchema } from "@/lib/formValidationSchemas";
import { changePassword } from "@/lib/actions";

export type ChangePasswordFormInput = ChangePasswordSchema;

type ChangePasswordFormState = {
  success: boolean;
  error: boolean;
  invalidCurrentPassword?: boolean;
};

const ChangePasswordForm = () => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordSchema>({
    resolver: zodResolver(changePasswordSchema),
  });

  const [state, formAction] = useActionState(
    changePassword,
    {
      success: false,
      error: false,
      invalidCurrentPassword: false,
    },
  );

  const onSubmit = handleSubmit((values) => {
    formAction(values);
  });

  useEffect(() => {
    if (state.success) {
      toast("Password updated");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <div className="flex flex-wrap gap-4">
        <InputField
          label="Current Password"
          type="password"
          name="currentPassword"
          register={register}
          error={errors.currentPassword}
        />
        <InputField
          label="New Password"
          type="password"
          name="newPassword"
          register={register}
          error={errors.newPassword}
        />
        <InputField
          label="Confirm New Password"
          type="password"
          name="confirmNewPassword"
          register={register}
          error={errors.confirmNewPassword}
        />
      </div>
      {state.invalidCurrentPassword ? (
        <span className="text-red-500 text-sm">Current password is incorrect.</span>
      ) : state.error ? (
        <span className="text-red-500 text-sm">Something went wrong!</span>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed self-start"
      >
        {isSubmitting ? "Saving..." : "Change Password"}
      </button>
    </form>
  );
};

export default ChangePasswordForm;
