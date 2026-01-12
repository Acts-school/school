"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import InputField from "../InputField";
import { profileSchema, type ProfileSchema } from "@/lib/formValidationSchemas";
import { updateProfile } from "@/lib/actions";

export type ProfileFormInput = ProfileSchema;

type ProfileFormProps = {
  initialData: ProfileFormInput;
  roleLabel: string;
};

const ProfileForm = ({ initialData, roleLabel }: ProfileFormProps) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
  });

  const [state, formAction] = useActionState(updateProfile, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((values) => {
    formAction(values);
  });

  useEffect(() => {
    if (state.success) {
      toast("Profile updated");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Role</span>
        <span className="text-gray-600">{roleLabel}</span>
      </div>
      <div className="flex flex-wrap gap-4">
        <InputField
          label="First Name"
          name="name"
          defaultValue={initialData.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Last Name"
          name="surname"
          defaultValue={initialData.surname}
          register={register}
          error={errors.surname}
        />
        <InputField
          label="Email"
          name="email"
          defaultValue={initialData.email ?? ""}
          register={register}
          error={errors.email as unknown as import("react-hook-form").FieldError}
        />
        <InputField
          label="Phone"
          name="phone"
          defaultValue={initialData.phone ?? ""}
          register={register}
          error={errors.phone as unknown as import("react-hook-form").FieldError}
        />
        <InputField
          label="Address"
          name="address"
          defaultValue={initialData.address}
          register={register}
          error={errors.address}
        />
      </div>
      {state.error && <span className="text-red-500 text-sm">Something went wrong!</span>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed self-start"
      >
        {isSubmitting ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
};

export default ProfileForm;
