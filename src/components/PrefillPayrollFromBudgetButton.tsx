"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { prefillPayrollFromBudget, type PrefillPayrollFromBudgetInput } from "@/lib/payroll.actions";

type PrefillPayrollFromBudgetButtonProps = {
  periodId: number;
  disabled?: boolean;
};

export default function PrefillPayrollFromBudgetButton({
  periodId,
  disabled,
}: PrefillPayrollFromBudgetButtonProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(prefillPayrollFromBudget, {
    success: false,
    error: false,
  });

  useEffect(() => {
    if (state.success) {
      toast("Payroll pre-filled from approved budget");
      router.refresh();
    }
    if (state.error) {
      toast.error("Could not pre-fill payroll from budget");
    }
  }, [state, router]);

  const handleClick = () => {
    if (disabled) return;

    const confirmed = window.confirm(
      "Pre-fill this payroll period from the approved budget? Existing basic salaries will be updated for staff that have matching budget lines. You can still edit rows afterwards.",
    );

    if (!confirmed) {
      return;
    }

    const payload: PrefillPayrollFromBudgetInput = {
      periodId,
    };

    formAction(payload);
  };

  const isBusy = state.success === false && state.error === false ? false : false;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isBusy}
      className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Pre-Fill from Budget
    </button>
  );
}
