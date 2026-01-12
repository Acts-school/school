"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useActionState, useEffect, type Dispatch, type SetStateAction } from "react";

import { createAttendance, updateAttendance } from "@/lib/actions";
import { attendanceSchema, type AttendanceSchema } from "@/lib/formValidationSchemas";
import {
  enqueueOfflineAttendanceCreate,
  enqueueOfflineAttendanceUpdate,
} from "@/lib/attendanceOfflineQueue";
import InputField from "../InputField";

type AttendanceFormProps = {
  type: "create" | "update";
  data?: unknown;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: unknown;
};

type AttendanceFormInput = {
  id?: number;
  date?: string | Date;
  present?: boolean;
  studentId?: string;
  lessonId?: number;
};

type AttendanceLessonOption = {
  id: number;
  name: string;
  subject?: { name: string } | null;
  class?: { name: string } | null;
};

type AttendanceStudentOption = {
  id: string;
  name: string;
  surname: string;
  class?: { name: string } | null;
};

type AttendanceFormRelatedData = {
  lessons?: AttendanceLessonOption[];
  students?: AttendanceStudentOption[];
};

const AttendanceForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: AttendanceFormProps) => {
  const generateClientRequestId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `offline-attendance-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const toDateString = (d: unknown): string => {
    if (d instanceof Date) {
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }

    if (typeof d === "string") {
      const t = new Date(d);
      if (!Number.isNaN(t.getTime())) {
        return t.toISOString().slice(0, 10);
      }
    }
    return new Date().toISOString().slice(0, 10);
  };

  const initialData: AttendanceFormInput | undefined =
    data && typeof data === "object" ? (data as AttendanceFormInput) : undefined;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AttendanceSchema>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: (() => {
      const id = typeof initialData?.id === "number" ? initialData.id : undefined;
      const date = toDateString(initialData?.date);
      const present: boolean =
        typeof initialData?.present === "boolean" ? initialData.present : true;
      const studentId: string =
        typeof initialData?.studentId === "string" ? initialData.studentId : "";
      const lessonId: number =
        typeof initialData?.lessonId === "number" ? initialData.lessonId : 0;

      return { id, date, present, studentId, lessonId } satisfies Partial<AttendanceSchema>;
    })(),
  });

  const [state, formAction] = useActionState(
    type === "create" ? createAttendance : updateAttendance,
    {
      success: false,
      error: false,
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Attendance has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);
  const onSubmit = handleSubmit((formData: AttendanceSchema) => {
    const isBrowser = typeof window !== "undefined";

    if (isBrowser && navigator.onLine === false) {
      const clientRequestId = generateClientRequestId();

      const basePayload = {
        date: formData.date,
        present: formData.present,
        studentId: formData.studentId,
        lessonId: formData.lessonId,
        clientRequestId,
      };

      const hasId = typeof formData.id === "number";

      const enqueuePromise = hasId
        ? enqueueOfflineAttendanceUpdate({
            ...basePayload,
            id: formData.id as number,
          })
        : enqueueOfflineAttendanceCreate(basePayload);

      void enqueuePromise.then(() => {
        toast("Attendance queued and will sync when you're back online.");
        setOpen(false);
        router.refresh();
      });

      return;
    }

    // Online path: use existing server action flow
    formAction(formData);
  });

  const typedRelatedData: AttendanceFormRelatedData | undefined =
    relatedData && typeof relatedData === "object"
      ? (relatedData as AttendanceFormRelatedData)
      : undefined;

  const lessons = typedRelatedData?.lessons ?? [];
  const students = typedRelatedData?.students ?? [];

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new attendance record" : "Update attendance record"}
      </h1>
      
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Date"
          name="date"
          type="date"
          register={register}
          error={errors?.date}
        />
        
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Student</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("studentId")}
          >
            <option value="">Select a student</option>
            {students.map((student) => (
              <option value={student.id} key={student.id}>
                {student.name} {student.surname}
              </option>
            ))}
          </select>
          {errors.studentId?.message && (
            <p className="text-xs text-red-400">
              {errors.studentId.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Lesson</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("lessonId", { valueAsNumber: true })}
          >
            <option value="">Select a lesson</option>
            {lessons.map((lesson) => (
              <option value={lesson.id} key={lesson.id}>
                {lesson.name} - {lesson.subject?.name}
              </option>
            ))}
          </select>
          {errors.lessonId?.message && (
            <p className="text-xs text-red-400">
              {errors.lessonId.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Status</label>
          <div className="flex items-center gap-4">
            <Controller
              name="present"
              control={control}
              render={({ field }) => (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="true"
                      checked={field.value === true}
                      onChange={() => field.onChange(true)}
                      className="w-4 h-4"
                    />
                    <label className="text-xs">Present</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="false"
                      checked={field.value === false}
                      onChange={() => field.onChange(false)}
                      className="w-4 h-4"
                    />
                    <label className="text-xs">Absent</label>
                  </div>
                </>
              )}
            />
          </div>
          {errors.present?.message && (
            <p className="text-xs text-red-400">
              {errors.present.message.toString()}
            </p>
          )}
        </div>
      </div>

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

export default AttendanceForm;