"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { examSchema, type ExamSchema } from "@/lib/formValidationSchemas";
import { createExam, updateExam } from "@/lib/actions";
import { Dispatch, SetStateAction, useActionState, useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type ExamFormProps = {
  type: "create" | "update";
  data?: unknown;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: unknown;
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

type ExamFormInput = {
  id?: number;
  title?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  lessonId?: number;
  kind?: AssessmentKindOption;
  cbcGateType?: CbcGateTypeOption;
  competencies?: CbcCompetencyOption[];
};

type ExamFormRelatedData = {
  lessons: Array<{ id: number; name: string }>;
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

const toDateTimeLocal = (value: Date | string | undefined): string => {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
};

const ExamForm = ({ type, data, setOpen, relatedData }: ExamFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ExamSchema>({
    resolver: zodResolver(examSchema),
  });

  // AFTER REACT 19 IT'LL BE USEACTIONSTATE

  const [state, formAction] = useActionState(
    type === "create" ? createExam : updateExam,
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
      toast(`Exam has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const initialData: ExamFormInput | undefined =
    data && typeof data === "object" ? (data as ExamFormInput) : undefined;

  const { lessons = [] } =
    relatedData && typeof relatedData === "object"
      ? ((relatedData as ExamFormRelatedData) ?? { lessons: [] })
      : { lessons: [] };

  const startDefault = toDateTimeLocal(initialData?.startTime);
  const endDefault = toDateTimeLocal(initialData?.endTime);

  const watchedKind = watch("kind") as AssessmentKindOption | undefined;
  const selectedKind: AssessmentKindOption =
    watchedKind ?? initialData?.kind ?? "FORMATIVE";
  const showGateType = selectedKind === "NATIONAL_GATE";

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new exam" : "Update the exam"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Exam title"
          name="title"
          defaultValue={initialData?.title ?? ""}
          register={register}
          error={errors.title}
        />
        <InputField
          label="Start Date"
          name="startTime"
          type="datetime-local"
          defaultValue={startDefault}
          register={register}
          error={errors.startTime}
        />
        <InputField
          label="End Date"
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
          <label className="text-xs text-gray-500">Lesson</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("lessonId")}
            defaultValue={initialData?.lessonId}
          >
            {lessons.map((lesson) => (
              <option value={lesson.id} key={lesson.id}>
                {lesson.name}
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

export default ExamForm;
