"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type SchoolOption = {
  id: number;
  name: string;
};

type SchoolSwitcherProps = {
  schools: SchoolOption[];
  currentSchoolId: number | null;
  isSuperAdmin: boolean;
};

const SchoolSwitcher = ({ schools, currentSchoolId, isSuperAdmin }: SchoolSwitcherProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    const value = event.target.value;
    const isAll = value === "__all";

    const parsed = isAll ? null : Number.parseInt(value, 10);

    if (!isAll && (parsed === null || Number.isNaN(parsed))) {
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/current-school", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ schoolId: parsed }),
      });

      if (response.ok) {
        router.refresh();
      }
    });
  };

  const selectedValue =
    isSuperAdmin && currentSchoolId === null
      ? "__all"
      : currentSchoolId !== null
        ? String(currentSchoolId)
        : "";

  return (
    <select
      value={selectedValue}
      onChange={handleChange}
      disabled={isPending}
      className="px-2 py-1 text-xs rounded-md ring-1 ring-gray-300 bg-white"
    >
      <option value="" disabled={schools.length > 0}>
        {schools.length > 1 ? "Select school" : "Current school"}
      </option>
      {isSuperAdmin && (
        <option value="__all">All schools (global)</option>
      )}
      {schools.map((school) => (
        <option key={school.id} value={String(school.id)}>
          {school.name}
        </option>
      ))}
    </select>
  );
};

export default SchoolSwitcher;
