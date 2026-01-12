"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import InputField from "../InputField";
import { announcementSchema, type AnnouncementSchema } from "@/lib/formValidationSchemas";
import { createAnnouncement, updateAnnouncement } from "@/lib/actions";

type AnnouncementFormRelatedData = {
  classes?: Array<{ id: number; name: string }>;
};

type AnnouncementFormInput = {
  id?: number;
  title?: string;
  description?: string;
  date?: Date | string;
  classId?: number | null;
  class?: { id: number; name: string } | null;
};

type AnnouncementFormProps = {
  type: "create" | "update";
  data?: unknown;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: unknown;
};

const AnnouncementForm = ({ type, data, setOpen, relatedData }: AnnouncementFormProps) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementSchema>({
    resolver: zodResolver(announcementSchema),
  });

  const [state, formAction] = useActionState(
    type === "create" ? createAnnouncement : updateAnnouncement,
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
      toast(`Announcement has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const initialData: AnnouncementFormInput | undefined =
    data && typeof data === "object" ? (data as AnnouncementFormInput) : undefined;

  const { classes = [] } =
    relatedData && typeof relatedData === "object"
      ? ((relatedData as AnnouncementFormRelatedData) ?? {})
      : ({} as AnnouncementFormRelatedData);

  const dateDefaultValue = initialData?.date
    ? new Date(initialData.date).toISOString().slice(0, 10)
    : "";

  const defaultClassId = initialData?.classId ?? initialData?.class?.id;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new announcement" : "Update the announcement"}
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
          label="Description"
          name="description"
          defaultValue={initialData?.description ?? ""}
          register={register}
          error={errors.description}
        />
        <InputField
          label="Date"
          name="date"
          type="date"
          defaultValue={dateDefaultValue}
          register={register}
          error={errors.date as unknown as import("react-hook-form").FieldError}
        />
        {initialData?.id !== undefined && (
          <InputField
            label="Id"
            name="id"
            defaultValue={String(initialData.id)}
            register={register}
            error={errors.id as unknown as import("react-hook-form").FieldError}
            hidden
          />
        )}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Class (optional)</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={defaultClassId ?? ""}
          >
            <option value="">All classes</option>
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

export default AnnouncementForm;
