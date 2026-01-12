"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import {
  Dispatch,
  SetStateAction,
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { studentSchema, type StudentSchema } from "@/lib/formValidationSchemas";
import { createStudent, updateStudent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

type StudentFormProps = {
  type: "create" | "update";
  data?: unknown;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: unknown;
};

type StudentFormInput = {
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
  gradeId?: number;
  classId?: number;
  parentId?: string;
};

type StudentFormRelatedData = {
  grades: Array<{ id: number; level: number }>;
  classes: Array<{ id: number; name: string; capacity: number; _count: { students: number } }>;
};

type StudentFormState = {
  success: boolean;
  error: boolean;
  errorMessage?: string;
};

const StudentForm = ({ type, data, setOpen, relatedData }: StudentFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentSchema>({
    resolver: zodResolver(studentSchema),
  });

  const initialData: StudentFormInput | undefined =
    data && typeof data === "object" ? (data as StudentFormInput) : undefined;

  const [imgUrl, setImgUrl] = useState<string | null>(initialData?.img ?? null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [state, formAction] = useActionState(
    type === "create" ? createStudent : updateStudent,
    {
      success: false,
      error: false,
    },
  );

  const onSubmit = handleSubmit((values) => {
    startTransition(() => {
      formAction({ ...values, img: imgUrl ?? undefined });
    });
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
      formData.append("entityType", "student");
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
      toast(`Student has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
    if (!state.success && state.error) {
      const narrowed = state as StudentFormState;
      toast(narrowed.errorMessage ?? "Failed to save student");
    }
  }, [state, router, type, setOpen]);

  const { grades = [], classes = [] } =
    relatedData && typeof relatedData === "object"
      ? ((relatedData as StudentFormRelatedData) ?? { grades: [], classes: [] })
      : { grades: [], classes: [] };

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
        {type === "create" ? "Create a new student" : "Update the student"}
      </h1>
      <span className="text-xs text-gray-400 font-medium">
        Authentication Information
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Admission Number"
          name="username"
          defaultValue={initialData?.username ?? ""}
          register={register}
          error={errors.username}
          inputProps={type === "update" ? { readOnly: true } : {}}
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
          inputProps={{ required: true }}
        />
        <InputField
          label="Address"
          name="address"
          defaultValue={initialData?.address ?? ""}
          register={register}
          error={errors.address}
          hidden
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
            initialData?.birthday
              ? new Date(initialData.birthday).toISOString().slice(0, 10)
              : ""
          }
          register={register}
          error={errors.birthday}
          type="date"
        />
        <InputField
          label="Parent Id"
          name="parentId"
          defaultValue={initialData?.parentId ?? ""}
          register={register}
          error={errors.parentId}
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
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Class</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={initialData?.classId}
          >
            {classes.map((classItem) => (
              <option value={classItem.id} key={classItem.id}>
                ({classItem.name} - {classItem._count.students + "/" + classItem.capacity} Capacity)
              </option>
            ))}
          </select>
          {errors.classId?.message && (
            <p className="text-xs text-red-400">
              {errors.classId.message.toString()}
            </p>
          )}
        </div>
      </div>
      {state.error && (
        <span className="text-red-500">
          {(state as StudentFormState).errorMessage ?? "Something went wrong!"}
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

export default StudentForm;
