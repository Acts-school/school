"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import InputField from "../InputField";
import { resultSchema, type ResultSchema } from "@/lib/formValidationSchemas";
import { createResult, updateResult } from "@/lib/actions";
import {
  enqueueOfflineResultCreate,
  enqueueOfflineResultUpdate,
} from "@/lib/resultsOfflineQueue";

type ResultFormProps = {
  type: "create" | "update";
  data?: unknown;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: unknown;
};

type ResultFormInput = {
  id?: number;
  score?: number;
  studentId?: string;
  examId?: number | null;
  assignmentId?: number | null;
};

type ResultFormRelatedData = {
  students?: Array<{ id: string; name: string; surname: string }>;
  exams?: Array<{ id: number; title: string }>;
  assignments?: Array<{ id: number; title: string }>;
};

const ResultForm = ({ type, data, setOpen, relatedData }: ResultFormProps) => {
  const generateClientRequestId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `offline-result-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResultSchema>({
    resolver: zodResolver(resultSchema),
  });

  const selectedExamId = watch("examId");
  const selectedAssignmentId = watch("assignmentId");

  const examSelected =
    typeof selectedExamId === "number" && selectedExamId > 0;
  const assignmentSelected =
    typeof selectedAssignmentId === "number" && selectedAssignmentId > 0;

  const examIdRegister = register("examId", { valueAsNumber: true });
  const assignmentIdRegister = register("assignmentId", { valueAsNumber: true });

  const [state, formAction] = useActionState(
    type === "create" ? createResult : updateResult,
    {
      success: false,
      error: false,
    },
  );

  const router = useRouter();

  const onSubmit = handleSubmit((values: ResultSchema) => {
    const isBrowser = typeof window !== "undefined";

    if (isBrowser && navigator.onLine === false) {
      const clientRequestId = generateClientRequestId();

      const basePayload = {
        score: values.score,
        studentId: values.studentId,
        clientRequestId,
        ...(typeof values.examId === "number" && values.examId > 0
          ? { examId: values.examId }
          : {}),
        ...(typeof values.assignmentId === "number" && values.assignmentId > 0
          ? { assignmentId: values.assignmentId }
          : {}),
      };

      const hasId = typeof values.id === "number";

      const enqueuePromise = hasId
        ? enqueueOfflineResultUpdate({
            ...basePayload,
            id: values.id as number,
          })
        : enqueueOfflineResultCreate(basePayload);

      void enqueuePromise.then(() => {
        toast("Result queued and will sync when you're back online.");
        setOpen(false);
        router.refresh();
      });

      return;
    }

    // Online path: use existing server action flow
    formAction(values);
  });

  useEffect(() => {
    if (state.success) {
      toast(`Result has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const initialData: ResultFormInput | undefined =
    data && typeof data === "object" ? (data as ResultFormInput) : undefined;

  const { students = [], exams = [], assignments = [] } =
    relatedData && typeof relatedData === "object"
      ? ((relatedData as ResultFormRelatedData) ?? {
          students: [],
          exams: [],
          assignments: [],
        })
      : { students: [], exams: [], assignments: [] };

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new result" : "Update the result"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Score"
          name="score"
          defaultValue={
            initialData?.score !== undefined ? String(initialData.score) : ""
          }
          register={register}
          error={errors.score}
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
          <label className="text-xs text-gray-500">Student</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("studentId")}
            defaultValue={initialData?.studentId ?? ""}
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
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
          <label className="text-xs text-gray-500">Exam (optional)</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...examIdRegister}
            onChange={(event) => {
              examIdRegister.onChange(event);
              const value = event.target.value;
              const parsed =
                value === "" ? undefined : Number.parseInt(value, 10);

              setValue("examId", parsed);
              if (typeof parsed === "number" && parsed > 0) {
                setValue("assignmentId", undefined);
              }
            }}
            defaultValue={initialData?.examId ?? ""}
            disabled={assignmentSelected}
          >
            <option value="">No exam</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Assignment (optional)</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...assignmentIdRegister}
            onChange={(event) => {
              assignmentIdRegister.onChange(event);
              const value = event.target.value;
              const parsed =
                value === "" ? undefined : Number.parseInt(value, 10);

              setValue("assignmentId", parsed);
              if (typeof parsed === "number" && parsed > 0) {
                setValue("examId", undefined);
              }
            }}
            defaultValue={initialData?.assignmentId ?? ""}
            disabled={examSelected}
          >
            <option value="">No assignment</option>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.title}
              </option>
            ))}
          </select>
          {errors.examId?.message && (
            <p className="text-xs text-red-400">
              {errors.examId.message.toString()}
            </p>
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

export default ResultForm;
