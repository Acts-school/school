"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import {
  Dispatch,
  SetStateAction,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { teacherSchema, type TeacherSchema } from "@/lib/formValidationSchemas";
import { createTeacher, updateTeacher } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

type TeacherFormProps = {
  type: "create" | "update";
  data?: unknown;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: unknown;
};

type TeacherFormInput = {
  id?: string;
  username?: string;
  password?: string;
  name?: string;
  surname?: string;
  email?: string | null;
  phone?: string | null;
  address?: string;
  img?: string | null;
  bloodType?: string;
  birthday?: Date | string;
  sex?: "MALE" | "FEMALE";
  subjects?: Array<string | number>;
};

type TeacherFormRelatedData = {
  subjects: Array<{ id: number; name: string }>;
};

type TeacherFormState = {
  success: boolean;
  error: boolean;
  errorMessage?: string;
};

const TeacherForm = ({ type, data, setOpen, relatedData }: TeacherFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeacherSchema>({
    resolver: zodResolver(teacherSchema),
  });

  const initialData: TeacherFormInput | undefined =
    data && typeof data === "object" ? (data as TeacherFormInput) : undefined;

  const [imgUrl, setImgUrl] = useState<string | null>(initialData?.img ?? null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [state, formAction] = useActionState(
    type === "create" ? createTeacher : updateTeacher,
    {
      success: false,
      error: false,
    },
  );

  const onSubmit = handleSubmit((values) => {
    formAction({ ...values, img: imgUrl ?? undefined });
  });

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    const file = fileList && fileList.length > 0 ? fileList[0] : null;

    if (!file) {
      return;
    }

    setIsUploadingImage(true);

    const formData = new FormData();
    formData.append("file", file);
    if (type === "update" && initialData?.id) {
      formData.append("entityType", "teacher");
      formData.append("entityId", initialData.id);
    }

    try {
      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        toast("Failed to upload image");
        return;
      }

      type UploadSuccess = { imageUrl: string };
      type UploadError = { error: string };
      type UploadResponse = UploadSuccess | UploadError;

      const json = (await response.json()) as UploadResponse;

      if ("imageUrl" in json) {
        setImgUrl(json.imageUrl);
        toast("Image uploaded successfully");
      } else {
        toast("Failed to upload image");
      }
    } catch (error) {
      console.error("Image upload failed", error);
      toast("Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Teacher has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
    if (!state.success && state.error) {
      const narrowed = state as TeacherFormState;
      toast(narrowed.errorMessage ?? "Failed to save teacher");
    }
  }, [state, router, type, setOpen]);

  const { subjects = [] } =
    relatedData && typeof relatedData === "object"
      ? ((relatedData as TeacherFormRelatedData) ?? { subjects: [] })
      : { subjects: [] };

  const initialSubjectIds: readonly string[] | undefined =
    initialData?.subjects?.map((subjectId) => String(subjectId));

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new teacher" : "Update the teacher"}
      </h1>
      <span className="text-xs text-gray-400 font-medium">
        Authentication Information
      </span>
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
          defaultValue={""}
          register={register}
          error={errors.password}
        />
      </div>
      <span className="text-xs text-gray-400 font-medium">
        Personal Information
      </span>
      <div className="flex justify-between flex-wrap gap-4">
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
        />
        <InputField
          label="ID Number"
          name="address"
          defaultValue={initialData?.address ?? ""}
          register={register}
          error={errors.address}
        />
        <InputField
          label="Blood Type"
          name="bloodType"
          defaultValue={initialData?.bloodType ?? ""}
          register={register}
          error={errors.bloodType}
        />
        <InputField
          label="Birthday"
          name="birthday"
          defaultValue={
            initialData?.birthday ? new Date(initialData.birthday).toISOString().slice(0, 10) : ""
          }
          register={register}
          error={errors.birthday}
          type="date"
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
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Sex</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("sex")}
            defaultValue={initialData?.sex}
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          {errors.sex?.message && (
            <p className="text-xs text-red-400">
              {errors.sex.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Subjects</label>
          <select
            multiple
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("subjects")}
            defaultValue={initialSubjectIds}
          >
            {subjects.map((subject) => (
              <option value={subject.id} key={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          {errors.subjects?.message && (
            <p className="text-xs text-red-400">
              {errors.subjects.message.toString()}
            </p>
          )}
        </div>
        <div
          className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
          onClick={() => {
            if (!isUploadingImage) {
              fileInputRef.current?.click();
            }
          }}
        >
          <Image src="/upload.png" alt="" width={28} height={28} />
          <span>Upload a photo</span>
          {isUploadingImage && (
            <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {state.error && (
        <span className="text-red-500">
          {(state as TeacherFormState).errorMessage ?? "Something went wrong!"}
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

export default TeacherForm;
