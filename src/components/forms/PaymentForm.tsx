"use client";

import { useForm } from "react-hook-form";
import { useActionState, useEffect } from "react";
import { recordPayment, type RecordPaymentInput, type PaymentMethod } from "@/lib/fees.actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const methods: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "POS", "ONLINE"];

export default function PaymentForm({ invoiceId }: { invoiceId: number }) {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RecordPaymentInput>({
    defaultValues: { invoiceId, amountMinor: 0, method: "CASH", reference: "" },
  });

  const [state, formAction] = useActionState(recordPayment, { success: false, error: false, message: "" });

  useEffect(() => {
    if (state.success) {
      toast("Payment recorded");
      router.refresh();
    } else if (state.error && state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const onSubmit = handleSubmit((data) => {
    const minor = Math.round(Number(data.amountMinor) * 100);
    formAction({ ...data, amountMinor: minor });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-3 items-end">
      <input type="hidden" value={invoiceId} {...register("invoiceId", { valueAsNumber: true })} />
      <div className="flex flex-col w-36">
        <label className="text-xs text-gray-500">Amount (KES)</label>
        <input type="number" step="0.01" className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("amountMinor", { required: true, min: 0, valueAsNumber: true })} />
        {errors.amountMinor && <span className="text-xs text-red-500">Required</span>}
      </div>
      <div className="flex flex-col w-40">
        <label className="text-xs text-gray-500">Method</label>
        <select className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("method", { required: true })}>
          {methods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col w-48">
        <label className="text-xs text-gray-500">Reference</label>
        <input className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("reference")} />
      </div>
      <div className="flex flex-col w-44">
        <label className="text-xs text-gray-500">Paid At (optional)</label>
        <input type="datetime-local" className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm" {...register("paidAt")} />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-500 text-white px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Saving..." : "Record"}
      </button>
    </form>
  );
}
