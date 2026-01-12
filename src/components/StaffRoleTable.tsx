"use client";

import { useActionState } from "react";
import type { StaffRole } from "@/lib/payroll.actions";
import { updateStaffRole, type UpdateStaffRoleInput } from "@/lib/staff.actions";

export type StaffRowForRoleTable = {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  basicSalary: number;
  email: string | null;
  phone: string | null;
};

type StaffRoleTableProps = {
  staff: ReadonlyArray<StaffRowForRoleTable>;
};

type UpdateStaffRoleState = {
  success: boolean;
  error: boolean;
};

const INITIAL_STATE: UpdateStaffRoleState = {
  success: false,
  error: false,
};

export default function StaffRoleTable({ staff }: StaffRoleTableProps) {
  const updateAction = async (
    _prevState: UpdateStaffRoleState,
    payload: UpdateStaffRoleInput,
  ): Promise<UpdateStaffRoleState> => {
    const result = await updateStaffRole({ success: false, error: false }, payload);
    return result;
  };

  const [state, formAction] = useActionState(updateAction, INITIAL_STATE);

  const handleRoleChange = (id: string, role: StaffRole) => {
    const payload: UpdateStaffRoleInput = { id, role };
    formAction(payload);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Role</th>
            <th className="py-2 pr-4">Basic Salary</th>
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Phone</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id} className="border-b last:border-b-0">
              <td className="py-2 pr-4">{`${s.firstName} ${s.lastName}`}</td>
              <td className="py-2 pr-4">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={s.role}
                  onChange={(e) => handleRoleChange(s.id, e.target.value as StaffRole)}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="ACCOUNTANT">ACCOUNTANT</option>
                  <option value="NON_TEACHING">NON_TEACHING</option>
                  <option value="SUPPORT">SUPPORT</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </td>
              <td className="py-2 pr-4">{`KES ${((s.basicSalary ?? 0) / 100).toFixed(2)}`}</td>
              <td className="py-2 pr-4">{s.email ?? ""}</td>
              <td className="py-2 pr-4">{s.phone ?? ""}</td>
            </tr>
          ))}
          {staff.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-500">
                No staff members yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {state.error && (
        <div className="mt-2 text-xs text-red-600">Failed to update staff role.</div>
      )}
      {state.success && !state.error && (
        <div className="mt-2 text-xs text-green-600">Staff role updated.</div>
      )}
    </div>
  );
}
