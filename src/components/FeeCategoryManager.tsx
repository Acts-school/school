"use client";

import { FormEvent, ChangeEvent, useMemo, useState } from "react";
import {
  useFeeCategories,
  useCreateFeeCategory,
  useUpdateFeeCategory,
  type CreateFeeCategoryInput,
  type FeeCategory,
} from "@/hooks/useFeeCategories";

const frequencyOptions: ReadonlyArray<CreateFeeCategoryInput["frequency"]> = [
  "TERMLY",
  "YEARLY",
  "ONE_TIME",
] as const;

export default function FeeCategoryManager() {
  const { data, isLoading } = useFeeCategories(false);
  const categories: ReadonlyArray<FeeCategory> = useMemo(
    () => data?.data ?? [],
    [data?.data],
  );

  const { mutate: createCategory, isPending: creating } = useCreateFeeCategory();
  const { mutate: updateCategory, isPending: updating } = useUpdateFeeCategory();

  const [newName, setNewName] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newFrequency, setNewFrequency] = useState<CreateFeeCategoryInput["frequency"]>(
    "TERMLY",
  );

  const [editingNames, setEditingNames] = useState<Record<number, string>>({});

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = newName.trim();
    const trimmedDescription = newDescription.trim();
    if (!trimmedName) {
      return;
    }

    const payload: CreateFeeCategoryInput = {
      name: trimmedName,
      ...(trimmedDescription.length > 0 ? { description: trimmedDescription } : {}),
      frequency: newFrequency,
    };

    createCategory(payload, {
      onSuccess: () => {
        setNewName("");
        setNewDescription("");
        setNewFrequency("TERMLY");
      },
    });
  };

  const handleNameChange = (id: number, event: ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    setEditingNames((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveName = (cat: FeeCategory) => {
    const nextName = (editingNames[cat.id] ?? cat.name).trim();
    if (!nextName || nextName === cat.name) {
      return;
    }
    updateCategory({ id: cat.id, name: nextName });
  };

  const handleToggleActive = (cat: FeeCategory) => {
    updateCategory({ id: cat.id, active: !cat.active });
  };

  return (
    <div className="bg-white p-4 rounded-md border flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-md font-semibold">Fee Categories</h2>
        <span className="text-xs text-gray-500">
          Manage names and activation for fee categories used in class fee structures.
        </span>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap gap-2 items-end border-b pb-3 mb-3"
      >
        <div className="flex flex-col gap-1 w-full sm:w-1/3">
          <label className="text-xs text-gray-500">Name</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            placeholder="e.g. Meals"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-1/3">
          <label className="text-xs text-gray-500">Description (optional)</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            value={newDescription}
            onChange={(e) => setNewDescription(e.currentTarget.value)}
            placeholder="Visible only to admins/accountants"
          />
        </div>
        <div className="flex flex-col gap-1 w-32">
          <label className="text-xs text-gray-500">Frequency</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            value={newFrequency}
            onChange={(e) =>
              setNewFrequency(e.currentTarget.value as CreateFeeCategoryInput["frequency"])
            }
          >
            {frequencyOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-blue-500 text-white px-3 py-2 rounded-md text-sm disabled:opacity-50"
        >
          {creating ? "Adding..." : "Add Category"}
        </button>
      </form>

      {isLoading && <div className="text-xs text-gray-500">Loading categories...</div>}

      {!isLoading && categories.length === 0 && (
        <div className="text-xs text-gray-500">No fee categories found.</div>
      )}

      {!isLoading && categories.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const nameValue = editingNames[cat.id] ?? cat.name;
                return (
                  <tr key={cat.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 align-top">
                      <input
                        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
                        value={nameValue}
                        onChange={(e) => handleNameChange(cat.id, e)}
                      />
                    </td>
                    <td className="py-2 pr-4 align-top">
                      <label className="inline-flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={cat.active}
                          onChange={() => handleToggleActive(cat)}
                          disabled={updating}
                        />
                        <span>{cat.active ? "Active" : "Inactive"}</span>
                      </label>
                    </td>
                    <td className="py-2 pr-4 align-top">
                      <button
                        type="button"
                        className="px-3 py-1.5 text-xs rounded border bg-white hover:bg-slate-100 disabled:opacity-50"
                        onClick={() => handleSaveName(cat)}
                        disabled={updating}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
