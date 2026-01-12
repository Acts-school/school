"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, startTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import InputField from "../InputField";
import { parentSchema, type ParentSchema } from "@/lib/formValidationSchemas";
import { createParent, updateParent } from "@/lib/actions";

type ParentFormInput = {
  id?: string;
  username?: string;
  password?: string;
  name?: string;
  surname?: string;
  email?: string | null;
  phone?: string;
  address?: string;
};

type ParentFormRelatedData = {
  grades: Array<{ id: number; level: number }>;
  classes: Array<{ id: number; name: string; capacity: number; _count: { students: number } }>;
};

type ParentFormProps = {
  type: "create" | "update";
  data?: unknown;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: unknown;
};

type ParentFormState = {
  success: boolean;
  error: boolean;
  errorMessage?: string;
};

const ParentForm = ({ type, data, setOpen, relatedData }: ParentFormProps) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ParentSchema>({
    resolver: zodResolver(parentSchema),
  });

  const [state, formAction] = useActionState(
    type === "create" ? createParent : updateParent,
    {
      success: false,
      error: false,
    },
  );

  const onSubmit = handleSubmit((values) => {
    startTransition(() => {
      formAction(values);
    });
  });

  useEffect(() => {
    if (state.success) {
      toast(`Parent has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const initialData: ParentFormInput | undefined =
    data && typeof data === "object" ? (data as ParentFormInput) : undefined;

  const safeRelated: Partial<ParentFormRelatedData> =
    relatedData && typeof relatedData === "object"
      ? (relatedData as Partial<ParentFormRelatedData>)
      : {};

  const grades: ParentFormRelatedData["grades"] = safeRelated.grades ?? [];
  const classes: ParentFormRelatedData["classes"] = safeRelated.classes ?? [];

  const getGradeLabel = (level: number): string => {
    if (level === 1) {
      return "PP1";
    }

    if (level === 2) {
      return "PP2";
    }

    const primaryOrJssGrade = level - 2;
    return `Grade ${primaryOrJssGrade}`;
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new parent" : "Update the parent"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Username"
          name="username"
          defaultValue={initialData?.username ?? ""}
          register={register}
          error={errors.username}
        />
        <InputField
          label="Email"
          name="email"
          defaultValue={initialData?.email ?? ""}
          register={register}
          error={errors.email}
        />
        <InputField
          label="Password"
          name="password"
          type="password"
          defaultValue=""
          register={register}
          error={errors.password}
        />
        <InputField
          label="First Name"
          name="name"
          defaultValue={initialData?.name ?? ""}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Last Name"
          name="surname"
          defaultValue={initialData?.surname ?? ""}
          register={register}
          error={errors.surname}
        />
        <InputField
          label="Phone"
          name="phone"
          defaultValue={initialData?.phone ?? ""}
          register={register}
          error={errors.phone}
          inputProps={{ required: true }}
        />
        <InputField
          label="ID Number"
          name="address"
          defaultValue={initialData?.address ?? ""}
          register={register}
          error={errors.address}
        />
        {initialData?.id !== undefined && (
          <InputField
            label="Id"
            name="id"
            defaultValue={initialData.id}
            register={register}
            error={errors.id}
            hidden
          />
        )}
      </div>
      {type === "create" && (
        <>
          <span className="text-xs text-gray-400 font-medium">Student Information</span>
          <div className="flex justify-between flex-wrap gap-4">
                <InputField
                  label="Student Username"
                  name="studentUsername"
                  defaultValue=""
                  register={register}
                  error={errors.studentUsername}
                />
                <InputField
                  label="Student Email"
                  name="studentEmail"
                  defaultValue=""
                  register={register}
                  error={errors.studentEmail}
                />
                <InputField
                  label="Student Password"
                  name="studentPassword"
                  type="password"
                  defaultValue=""
                  register={register}
                  error={errors.studentPassword}
                />
                <InputField
                  label="Student First Name"
                  name="studentName"
                  defaultValue=""
                  register={register}
                  error={errors.studentName}
                />
                <InputField
                  label="Student Last Name"
                  name="studentSurname"
                  defaultValue=""
                  register={register}
                  error={errors.studentSurname}
                />
                <InputField
                  label="Student Phone"
                  name="studentPhone"
                  defaultValue=""
                  register={register}
                  error={errors.studentPhone}
                  inputProps={{ required: true }}
                />
                <InputField
                  label="Student Blood Type"
                  name="studentBloodType"
                  defaultValue=""
                  register={register}
                  error={errors.studentBloodType}
                />
                <InputField
                  label="Student Birthday"
                  name="studentBirthday"
                  defaultValue=""
                  register={register}
                  error={errors.studentBirthday}
                  type="date"
                />
                <div className="flex flex-col gap-2 w-full md:w-1/4">
                  <label className="text-xs text-gray-500">Student Sex</label>
                  <select
                    className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
                    {...register("studentSex")}
                    defaultValue={undefined}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                  {errors.studentSex?.message && (
                    <p className="text-xs text-red-400">
                      {errors.studentSex.message.toString()}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-full md:w-1/4">
                  <label className="text-xs text-gray-500">Student Grade</label>
                  <select
                    className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
                    {...register("studentGradeId")}
                    defaultValue={undefined}
                  >
                    {grades.map((grade) => (
                      <option value={grade.id} key={grade.id}>
                        {getGradeLabel(grade.level)}
                      </option>
                    ))}
                  </select>
                  {errors.studentGradeId?.message && (
                    <p className="text-xs text-red-400">
                      {errors.studentGradeId.message.toString()}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-full md:w-1/4">
                  <label className="text-xs text-gray-500">Student Class</label>
                  <select
                    className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
                    {...register("studentClassId")}
                    defaultValue={undefined}
                  >
                    {classes.map((classItem) => (
                      <option value={classItem.id} key={classItem.id}>
                        ({classItem.name} - {classItem._count.students + "/" + classItem.capacity} Capacity)
                      </option>
                    ))}
                  </select>
                  {errors.studentClassId?.message && (
                    <p className="text-xs text-red-400">
                      {errors.studentClassId.message.toString()}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
      {state.error && (
        <span className="text-red-500">
          {(state as ParentFormState).errorMessage ?? "Something went wrong!"}
        </span>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting
          ? type === "create"
            ? "Creating..."
            : "Updating..."
          : type === "create"
          ? "Create"
          : "Update"}
      </button>
    </form>
  );
};

export default ParentForm;
