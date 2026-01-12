"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { classSchema, type ClassSchema } from "@/lib/formValidationSchemas";
import { createClass, updateClass } from "@/lib/actions";
import { Dispatch, SetStateAction, useActionState, useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type ClassFormProps = {
  type: "create" | "update";
  data?: unknown;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: unknown;
};

type ClassFormInput = {
  id?: number;
  name?: string;
  capacity?: number;
  gradeId?: number;
  supervisorId?: string | null;
};

type ClassFormRelatedData = {
  teachers: Array<{ id: string; name: string; surname: string }>;
  grades: Array<{ id: number; level: number }>;
};

const ClassForm = ({ type, data, setOpen, relatedData }: ClassFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClassSchema>({
    resolver: zodResolver(classSchema),
  });

  // AFTER REACT 19 IT'LL BE USEACTIONSTATE

  const [state, formAction] = useActionState(
    type === "create" ? createClass : updateClass,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Class has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const initialData: ClassFormInput | undefined =
    data && typeof data === "object" ? (data as ClassFormInput) : undefined;

  const { teachers = [], grades = [] } =
    relatedData && typeof relatedData === "object"
      ? ((relatedData as ClassFormRelatedData) ?? { teachers: [], grades: [] })
      : { teachers: [], grades: [] };

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
        {type === "create" ? "Create a new class" : "Update the class"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Class name"
          name="name"
          defaultValue={initialData?.name ?? ""}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Capacity"
          name="capacity"
          defaultValue={initialData?.capacity !== undefined ? String(initialData.capacity) : ""}
          register={register}
          error={errors.capacity}
        />
        {initialData?.id !== undefined && (
          <InputField
            label="Id"
            name="id"
            defaultValue={String(initialData.id)}
            register={register}
            error={errors.id}
            hidden
          />
        )}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Supervisor</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("supervisorId")}
            defaultValue={initialData?.supervisorId ?? ""}
          >
            {teachers.map((teacher) => (
              <option value={teacher.id} key={teacher.id}>
                {teacher.name + " " + teacher.surname}
              </option>
            ))}
          </select>
          {errors.supervisorId?.message && (
            <p className="text-xs text-red-400">
              {errors.supervisorId.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Grade</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("gradeId")}
            defaultValue={initialData?.gradeId}
          >
            {grades.map((grade) => (
              <option value={grade.id} key={grade.id}>
                {getGradeLabel(grade.level)}
              </option>
            ))}
          </select>
          {errors.gradeId?.message && (
            <p className="text-xs text-red-400">
              {errors.gradeId.message.toString()}
            </p>
          )}
        </div>
      </div>
      {state.error && (
        <span className="text-red-500">Something went wrong!</span>
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

export default ClassForm;
