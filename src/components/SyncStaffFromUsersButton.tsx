"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { syncStaffFromUsers, type SyncStaffFromUsersInput } from "@/lib/staff.actions";

export default function SyncStaffFromUsersButton() {
  const router = useRouter();
  const [state, formAction] = useActionState(syncStaffFromUsers, { success: false, error: false });

  useEffect(() => {
    if (state.success) {
      toast("Staff synced from existing users");
      router.refresh();
    }
    if (state.error) {
      toast.error("Error syncing staff");
    }
  }, [state, router]);

  const handleClick = () => {
    const input: SyncStaffFromUsersInput = { confirm: true };
    formAction(input);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-3 py-2 text-sm rounded-md bg-gray-800 text-white"
    >
      Sync Staff from Users
    </button>
  );
}
