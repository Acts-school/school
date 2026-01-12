"use client";

import { useState } from "react";
import MyStudentFeesClient from "@/components/MyStudentFeesClient";

export interface ParentFeesClientStudent {
  id: string;
  name: string;
  surname: string;
}

export interface ParentFeesClientProps {
  students: ReadonlyArray<ParentFeesClientStudent>;
}

export default function ParentFeesClient({ students }: ParentFeesClientProps) {
  const hasSingle = students.length === 1;
  const [selectedId, setSelectedId] = useState<string | "all">(
    hasSingle ? students[0]!.id : "all",
  );

  const effectiveStudentId: string | undefined = selectedId === "all" ? undefined : selectedId;

  return (
    <div className="flex flex-col gap-3">
      {students.length === 0 ? (
        <div className="bg-white p-4 rounded-md text-sm text-gray-500">
          No children are currently linked to your account. Please contact the school administration if
          this seems incorrect.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-gray-500" htmlFor="parent-fees-student-select">
              Child
            </label>
            <select
              id="parent-fees-student-select"
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm min-w-[160px]"
              value={selectedId}
              onChange={(e) => setSelectedId(e.currentTarget.value)}
            >
              {!hasSingle && <option value="all">All children</option>}
              {students.map((s) => (
                <option key={s.id} value={s.id}>{`${s.name} ${s.surname}`}</option>
              ))}
            </select>
          </div>
          <MyStudentFeesClient
            title="Children&apos;s Fees"
            allowPayments
            role="parent"
            {...(typeof effectiveStudentId === "string" ? { studentId: effectiveStudentId } : {})}
          />
        </>
      )}
    </div>
  );
}
