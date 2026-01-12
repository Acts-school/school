"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import InputField from "../InputField";
import { assignmentSchema, type AssignmentSchema } from "@/lib/formValidationSchemas";
import { createAssignment, updateAssignment } from "@/lib/actions";
import {
  enqueueOfflineAssignmentCreate,
  enqueueOfflineAssignmentUpdate,
  type AssignmentKindCode,
  type CbcCompetencyCode,
} from "@/lib/assignmentsOfflineQueue";

type AssignmentFormRelatedData = {
  lessons?: Array<{ id: number; name: string }>;
};

type AssessmentKindOption = "FORMATIVE" | "SUMMATIVE" | "NATIONAL_GATE";

type CbcGateTypeOption = "KPSEA" | "KILEA" | "SENIOR_EXIT";

type CbcCompetencyOption =
  | "COMMUNICATION_COLLABORATION"
  | "CRITICAL_THINKING_PROBLEM_SOLVING"
  | "IMAGINATION_CREATIVITY"
  | "CITIZENSHIP"
  | "DIGITAL_LITERACY"
  | "LEARNING_TO_LEARN"
  | "SELF_EFFICACY";

type AssignmentFormInput = {
  id?: number;
  title?: string;
  startDate?: Date | string;
  dueDate?: Date | string;
  lessonId?: number;
  kind?: AssessmentKindOption;
  cbcGateType?: CbcGateTypeOption;
  competencies?: CbcCompetencyOption[];
};

const ASSESSMENT_KIND_OPTIONS: { value: AssessmentKindOption; label: string }[] = [
  { value: "FORMATIVE", label: "Formative" },
  { value: "SUMMATIVE", label: "Summative" },
  { value: "NATIONAL_GATE", label: "National gate" },
];

const CBC_GATE_TYPE_OPTIONS: { value: CbcGateTypeOption; label: string }[] = [
  { value: "KPSEA", label: "KPSEA (Grade 6)" },
  { value: "KILEA", label: "KILEA (Grade 9)" },
  { value: "SENIOR_EXIT", label: "Senior exit (Grade 12)" },
];

const CBC_COMPETENCY_OPTIONS: { value: CbcCompetencyOption; label: string }[] = [
  {
    value: "COMMUNICATION_COLLABORATION",
    label: "Communication & Collaboration",
  },
  {
    value: "CRITICAL_THINKING_PROBLEM_SOLVING",
    label: "Critical Thinking & Problem Solving",
  },
  { value: "IMAGINATION_CREATIVITY", label: "Imagination & Creativity" },
  { value: "CITIZENSHIP", label: "Citizenship" },
  { value: "DIGITAL_LITERACY", label: "Digital Literacy" },
  { value: "LEARNING_TO_LEARN", label: "Learning to Learn" },
  { value: "SELF_EFFICACY", label: "Self-Efficacy" },
];

type AssignmentFormProps = {
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

const AssignmentForm = ({ type, data, setOpen, relatedData }: AssignmentFormProps) => {
  const router = useRouter();

  const generateClientRequestId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `offline-assignment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<AssignmentSchema>({
    resolver: zodResolver(assignmentSchema),
  });

  const [state, formAction] = useActionState(
    type === "create" ? createAssignment : updateAssignment,
    {
      success: false,
      error: false,
    },
  );

  const onSubmit = handleSubmit((values: AssignmentSchema) => {
    const isBrowser = typeof window !== "undefined";

    if (isBrowser && navigator.onLine === false) {
      const clientRequestId = generateClientRequestId();

      const startDateIso = values.startDate.toISOString();
      const dueDateIso = values.dueDate.toISOString();

      const hasId = typeof values.id === "number";

      const commonFields = {
        title: values.title,
        startDate: startDateIso,
        dueDate: dueDateIso,
        lessonId: values.lessonId,
      };

      const kindFields =
        values.kind !== undefined
          ? { kind: values.kind as AssignmentKindCode }
          : {};

      const competencyFields =
        values.competencies !== undefined && values.competencies.length > 0
          ? { competencies: values.competencies as CbcCompetencyCode[] }
          : {};

      const enqueuePromise = hasId
        ? enqueueOfflineAssignmentUpdate({
            ...commonFields,
            ...kindFields,
            ...competencyFields,
            id: values.id as number,
            clientRequestId,
          })
        : enqueueOfflineAssignmentCreate({
            ...commonFields,
            ...kindFields,
            ...competencyFields,
            clientRequestId,
          });

      void enqueuePromise.then(() => {
        toast("Assignment queued and will sync when you're back online.");
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
      toast(`Assignment has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const initialData: AssignmentFormInput | undefined =
    data && typeof data === "object" ? (data as AssignmentFormInput) : undefined;

  const { lessons = [] } =
    relatedData && typeof relatedData === "object"
      ? ((relatedData as AssignmentFormRelatedData) ?? {})
      : ({} as AssignmentFormRelatedData);

  const startDefault = toDateTimeLocal(initialData?.startDate);
  const dueDefault = toDateTimeLocal(initialData?.dueDate);
  const watchedKind = watch("kind") as AssessmentKindOption | undefined;
  const selectedKind: AssessmentKindOption =
    watchedKind ?? initialData?.kind ?? "FORMATIVE";
  const showGateType = selectedKind === "NATIONAL_GATE";

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new assignment" : "Update the assignment"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Title"
          name="title"
          defaultValue={initialData?.title ?? ""}
          register={register}
          error={errors.title}
        />
        <InputField
          label="Start date"
          name="startDate"
          type="datetime-local"
          defaultValue={startDefault}
          register={register}
          error={errors.startDate}
        />
        <InputField
          label="Due date"
          name="dueDate"
          type="datetime-local"
          defaultValue={dueDefault}
          register={register}
          error={errors.dueDate}
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
          <label className="text-xs text-gray-500">Lesson</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("lessonId")}
            defaultValue={initialData?.lessonId}
          >
            <option value="">Select lesson</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.name}
              </option>
            ))}
          </select>
          {errors.lessonId?.message && (
            <p className="text-xs text-red-400">{errors.lessonId.message.toString()}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Assessment type</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("kind")}
            defaultValue={initialData?.kind ?? "FORMATIVE"}
          >
            {ASSESSMENT_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {showGateType && (
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">CBC gate type</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("cbcGateType")}
              defaultValue={initialData?.cbcGateType ?? ""}
            >
              <option value="">None</option>
              {CBC_GATE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-2 w-full">
          <label className="text-xs text-gray-500">Target competencies</label>
          <select
            multiple
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full h-32"
            {...register("competencies")}
            defaultValue={initialData?.competencies ?? []}
          >
            {CBC_COMPETENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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

export default AssignmentForm;
