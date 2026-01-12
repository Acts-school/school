"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { closePayrollPeriod, type ClosePayrollPeriodInput } from "@/lib/payroll.actions";

type ClosePayrollPeriodButtonProps = {
  periodId: number;
  disabled?: boolean;
};

export default function ClosePayrollPeriodButton({
  periodId,
  disabled,
}: ClosePayrollPeriodButtonProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(closePayrollPeriod, {
    success: false,
    error: false,
  });

  useEffect(() => {
    if (state.success) {
      toast("Payroll period closed");
      router.push("/finance/payroll");
    }
    if (state.error) {
      toast.error("Error closing payroll period");
    }
  }, [state, router]);

  const handleClick = () => {
    if (disabled) return;

    const confirmed = window.confirm(
      "Are you sure you want to close this payroll period? This will mark the period as PAID and create a Payroll expense entry. This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    const payload: ClosePayrollPeriodInput = {
      periodId,
      createExpense: true,
    };
    formAction(payload);
  };

  const isBusy = state.success === false && state.error === false ? false : false;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isBusy}
      className="px-3 py-2 text-sm rounded-md bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Close Period
    </button>
  );
}
