"use client";

import { useForm } from "react-hook-form";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createStaff, type CreateStaffInput } from "@/lib/staff.actions";
import type { StaffRole } from "@/lib/payroll.actions";

const roles: StaffRole[] = [
  "ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "NON_TEACHING",
  "SUPPORT",
  "OTHER",
];

export default function StaffForm() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateStaffInput>({
    defaultValues: {
      firstName: "",
      lastName: "",
      role: "TEACHER",
      basicSalaryMinor: 0,
      email: "",
      phone: "",
    },
  });

  const [state, formAction] = useActionState(createStaff, { success: false, error: false });

  useEffect(() => {
    if (state.success) {
      toast("Staff member created");
      router.refresh();
    }
  }, [state, router]);

  const onSubmit = handleSubmit((data) => {
    const minor = Math.round(Number(data.basicSalaryMinor) * 100);
    formAction({ ...data, basicSalaryMinor: minor });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">First Name</label>
        <input
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
          {...register("firstName", { required: true })}
        />
        {errors.firstName && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Last Name</label>
        <input
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
          {...register("lastName", { required: true })}
        />
        {errors.lastName && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Role</label>
        <select
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
          {...register("role", { required: true })}
        >
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {errors.role && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Basic Salary (KES)</label>
        <input
          type="number"
          step="0.01"
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
          {...register("basicSalaryMinor", { required: true, min: 0, valueAsNumber: true })}
        />
        {errors.basicSalaryMinor && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Email (optional)</label>
        <input
          type="email"
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
          {...register("email")}
        />
      </div>
      <div className="flex flex-col w-full md:w-1/4">
        <label className="text-xs text-gray-500">Phone (optional)</label>
        <input
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
          {...register("phone")}
        />
      </div>
      <button className="bg-blue-500 text-white px-3 py-2 rounded-md">Add Staff</button>
    </form>
  );
}
