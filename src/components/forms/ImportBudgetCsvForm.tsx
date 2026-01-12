"use client";

import { useActionState, useState } from "react";
import { importBudgetFromCsv, type ImportBudgetCsvState } from "@/lib/budget.actions";

const INITIAL_STATE: ImportBudgetCsvState = {
  success: false,
  error: false,
};

export function ImportBudgetCsvForm() {
  const [academicYear, setAcademicYear] = useState<string>("2024");
  const [label, setLabel] = useState<string>("Proposed Budget 2024");
  const [csv, setCsv] = useState<string>("");

  const importAction = async (_prevState: ImportBudgetCsvState, _formData: FormData) => {
    const parsedYear = Number(academicYear);
    const safeYear = Number.isFinite(parsedYear) ? parsedYear : 0;

    return importBudgetFromCsv(INITIAL_STATE, {
      academicYear: safeYear,
      label,
      csv,
    });
  };

  const [state, formAction] = useActionState(importAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-3xl">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="academicYear">
          Academic Year
        </label>
        <input
          id="academicYear"
          type="number"
          className="border rounded px-2 py-1 text-sm max-w-xs"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="label">
          Budget Label
        </label>
        <input
          id="label"
          type="text"
          className="border rounded px-2 py-1 text-sm max-w-md"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="csv">
          CSV Content
        </label>
        <textarea
          id="csv"
          className="border rounded px-2 py-1 text-sm font-mono min-h-[260px]"
          placeholder="Paste the 2024 budget CSV here"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          Only the first 12 numeric columns after the item name will be treated as Jan–Dec.
          Rows with all-zero months or totals (TOTAL / GRAND TOTAL) will be ignored.
        </p>
      </div>

      {state.message && (
        <div
          className={`text-sm ${state.error ? "text-red-600" : state.success ? "text-green-600" : ""}`}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        disabled={csv.trim().length === 0}
      >
        Import Budget CSV
      </button>
    </form>
  );
}
