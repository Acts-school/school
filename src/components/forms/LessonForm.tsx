"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import InputField from "../InputField";
import { lessonSchema, type LessonSchema } from "@/lib/formValidationSchemas";
import { createLesson, updateLesson } from "@/lib/actions";

type LessonFormRelatedData = {
  subjects?: Array<{ id: number; name: string }>;
  classes?: Array<{ id: number; name: string }>;
  teachers?: Array<{ id: string; name: string; surname: string }>;
};

type LessonFormInput = {
  id?: number;
  name?: string;
  day?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";
  startTime?: Date | string;
  endTime?: Date | string;
  subjectId?: number;
  classId?: number;
  teacherId?: string;
};

type LessonFormProps = {
  type: "create" | "update";
  data?: unknown;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: unknown;
};

const toDateTimeLocal = (value: Date | string | undefined): string => {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
};

const LessonForm = ({ type, data, setOpen, relatedData }: LessonFormProps) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LessonSchema>({
    resolver: zodResolver(lessonSchema),
  });

  const [state, formAction] = useActionState(
    type === "create" ? createLesson : updateLesson,
    {
      success: false,
      error: false,
    },
  );

  const onSubmit = handleSubmit((values) => {
    formAction(values);
  });

  useEffect(() => {
    if (state.success) {
      toast(`Lesson has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const initialData: LessonFormInput | undefined =
    data && typeof data === "object" ? (data as LessonFormInput) : undefined;

  const { subjects = [], classes = [], teachers = [] } =
    relatedData && typeof relatedData === "object"
      ? ((relatedData as LessonFormRelatedData) ?? {})
      : ({} as LessonFormRelatedData);

  const startDefault = toDateTimeLocal(initialData?.startTime);
  const endDefault = toDateTimeLocal(initialData?.endTime);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new lesson" : "Update the lesson"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Lesson name"
          name="name"
          defaultValue={initialData?.name ?? ""}
          register={register}
          error={errors.name}
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Day</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("day")}
            defaultValue={initialData?.day ?? "MONDAY"}
          >
            <option value="MONDAY">Monday</option>
            <option value="TUESDAY">Tuesday</option>
            <option value="WEDNESDAY">Wednesday</option>
            <option value="THURSDAY">Thursday</option>
            <option value="FRIDAY">Friday</option>
          </select>
          {errors.day?.message && (
            <p className="text-xs text-red-400">{errors.day.message.toString()}</p>
          )}
        </div>
        <InputField
          label="Start time"
          name="startTime"
          type="datetime-local"
          defaultValue={startDefault}
          register={register}
          error={errors.startTime}
        />
        <InputField
          label="End time"
          name="endTime"
          type="datetime-local"
          defaultValue={endDefault}
          register={register}
          error={errors.endTime}
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
          <label className="text-xs text-gray-500">Subject</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("subjectId")}
            defaultValue={initialData?.subjectId}
          >
            <option value="">Select subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          {errors.subjectId?.message && (
            <p className="text-xs text-red-400">{errors.subjectId.message.toString()}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Class</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={initialData?.classId}
          >
            <option value="">Select class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          {errors.classId?.message && (
            <p className="text-xs text-red-400">{errors.classId.message.toString()}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Teacher</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("teacherId")}
            defaultValue={initialData?.teacherId}
          >
            <option value="">Select teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} {teacher.surname}
              </option>
            ))}
          </select>
          {errors.teacherId?.message && (
            <p className="text-xs text-red-400">{errors.teacherId.message.toString()}</p>
          )}
        </div>
      </div>
      {state.error && <span className="text-red-500">Something went wrong!</span>}
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

export default LessonForm;
