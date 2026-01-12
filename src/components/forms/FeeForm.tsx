"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import InputField from "../InputField";
import { feeStructureSchema, type FeeStructureSchema } from "@/lib/formValidationSchemas";
import { useCreateFee, type FeeStructureRow, type CreateFeeInput } from "@/hooks/useFees";

const FeeForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: FeeStructureRow;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: { classes?: Array<{ id: number; name: string }>; grades?: Array<{ id: number; level: number }> };
}) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FeeStructureSchema>({
    resolver: zodResolver(feeStructureSchema),
    defaultValues: data
      ? {
          id: data.id,
          name: data.name,
          description: data.description ?? "",
          amount: data.amount / 100,
          classId: data.class?.id,
        }
      : {
          name: "",
          description: "",
          amount: 0,
          classId: undefined,
        },
  });

  const { mutate, isPending, isSuccess } = useCreateFee();

  useEffect(() => {
    if (isSuccess) {
      setOpen(false);
      router.refresh();
    }
  }, [isSuccess, router, setOpen]);

  const onSubmit = handleSubmit((values) => {
    const payload: CreateFeeInput = {
      name: values.name,
      amount: values.amount,
      ...(values.description && values.description.trim().length > 0
        ? { description: values.description }
        : {}),
      ...(typeof values.classId === "number" ? { classId: values.classId } : {}),
    };

    mutate(payload, {
      onError: (error) => {
        toast.error(`Error: ${error.message}`);
      },
    });
  });

  const classes = relatedData?.classes ?? [];

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new fee structure" : "Update the fee structure"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Title"
          name="name"
          defaultValue={data?.name ?? ""}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Amount (KES)"
          name="amount"
          type="number"
          defaultValue={data ? String(data.amount / 100) : ""}
          register={register}
          error={errors.amount}
          inputProps={{ step: "0.01", min: 0 }}
        />
        <InputField
          label="Description"
          name="description"
          defaultValue={data?.description ?? ""}
          register={register}
          error={errors.description}
        />
        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={String(data.id)}
            register={register}
            error={errors.id}
            hidden
          />
        )}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Class (optional)</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={data?.class?.id}
          >
            <option value="">None</option>
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
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Saving..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default FeeForm;
