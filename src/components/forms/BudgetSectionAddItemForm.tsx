"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  createBudgetItemWithAmounts,
  type CreateBudgetItemInput,
  type CreateBudgetItemState,
} from "@/lib/budget.actions";

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type BudgetSectionAddItemFormProps = {
  budgetSectionId: number;
  sectionName: string;
  staffOptions: ReadonlyArray<StaffOption>;
};

const MONTH_LABELS: ReadonlyArray<string> = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function BudgetSectionAddItemForm({
  budgetSectionId,
  sectionName,
  staffOptions,
}: BudgetSectionAddItemFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [monthValues, setMonthValues] = useState<ReadonlyArray<string>>(
    () => Array.from({ length: 12 }, () => ""),
  );

  type AddItemActionState = CreateBudgetItemState;

  type AddItemAction = (
    state: AddItemActionState,
    payload: CreateBudgetItemInput,
  ) => Promise<CreateBudgetItemState>;

  const [state, formAction] = useActionState<AddItemActionState, CreateBudgetItemInput>(
    createBudgetItemWithAmounts as unknown as AddItemAction,
    {
      success: false,
      error: false,
    },
  );

  const isStaffSection = sectionName === "Staff salaries - Current";

  useEffect(() => {
    if (state.success) {
      toast("Budget item added");
      setIsOpen(false);
      setName("");
      setNotes("");
      setStaffId("");
      setMonthValues(Array.from({ length: 12 }, () => ""));
      router.refresh();
    }
    if (state.error && state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const handleToggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMonthChange = (index: number, value: string) => {
    setMonthValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return;
    }

    const monthlyAmounts = monthValues.map((raw, index) => {
      const trimmed = raw.trim();
      if (trimmed === "") {
        return { month: index + 1, amountMajor: 0 };
      }
      const parsed = Number(trimmed.replace(/,/g, ""));
      const safe = Number.isFinite(parsed) ? parsed : 0;
      return { month: index + 1, amountMajor: safe };
    });

    const trimmedNotes = notes.trim();

    const payload: CreateBudgetItemInput = {
      budgetSectionId,
      name: trimmedName,
      monthlyAmounts,
      ...(isStaffSection && staffId ? { staffId } : {}),
      ...(trimmedNotes !== "" ? { notes: trimmedNotes } : {}),
    };

    formAction(payload);
  };

  if (!isOpen) {
    return (
      <div className="px-4 py-2 border-b">
        <button
          type="button"
          onClick={handleToggleOpen}
          className="inline-flex items-center justify-center rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Add item
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <label className="font-medium">Item name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="border rounded px-2 py-1 text-xs max-w-sm"
          />
        </div>

        {isStaffSection && staffOptions.length > 0 && (
          <div className="flex flex-col gap-1 max-w-sm">
            <label className="font-medium">Linked staff</label>
            <select
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="">Select staff...</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.firstName} {staff.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="font-medium">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="border rounded px-2 py-1 text-xs max-w-lg"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-medium">Monthly amounts (KES)</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-xl">
            {MONTH_LABELS.map((label, index) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[11px] text-gray-600">{label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={monthValues[index]}
                  onChange={(event) => handleMonthChange(index, event.target.value)}
                  className="border rounded px-2 py-1 text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {state.message && (
          <div className={state.error ? "text-red-600" : "text-green-600"}>{state.message}</div>
        )}

        <div className="flex flex-row gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Save item
          </button>
          <button
            type="button"
            onClick={handleToggleOpen}
            className="inline-flex items-center justify-center rounded bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
