"use client";

import { useState, type FormEvent } from "react";
import type { PaymentMethod } from "@/lib/fees.actions";
import { useCreatePayment, useInitiateMpesaPayment } from "@/hooks/usePayments";

const methods: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "POS", "ONLINE", "MPESA"];

export type StudentFeePaymentFormInlineProps = {
  studentFeeId: string;
  outstandingMinor: number;
};

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

const StudentFeePaymentFormInline = ({
  studentFeeId,
  outstandingMinor,
}: StudentFeePaymentFormInlineProps) => {
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  const mutation = useCreatePayment();
  const mpesaMutation = useInitiateMpesaPayment();

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      // Basic client-side guard; API will also validate
      return;
    }

    if (method === "MPESA") {
      const trimmedPhone = phoneNumber.trim();
      if (!trimmedPhone) {
        return;
      }

      mpesaMutation.mutate({
        studentFeeId,
        amount: parsedAmount,
        phoneNumber: trimmedPhone,
      });
      return;
    }

    mutation.mutate({
      studentFeeId,
      amount: parsedAmount,
      method,
      ...(reference ? { reference } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex flex-col w-28">
        <label className="text-[10px] text-gray-500">Amount (KES)</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-xs"
        />
        <span className="text-[10px] text-gray-400">
          Outstanding: {formatKES(outstandingMinor)}
        </span>
      </div>
      <div className="flex flex-col w-28">
        <label className="text-[10px] text-gray-500">Method</label>
        <select
          className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-xs"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        >
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      {method === "MPESA" ? (
        <div className="flex flex-col w-32">
          <label className="text-[10px] text-gray-500">Phone number</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-xs"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-col w-32">
          <label className="text-[10px] text-gray-500">Reference</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-1 rounded-md text-xs"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
      )}
      <button
        type="submit"
        className="bg-lamaPurple text-white px-3 py-1 rounded-md text-xs disabled:opacity-60"
        disabled={mutation.status === "pending" || mpesaMutation.status === "pending"}
      >
        {mutation.status === "pending" || mpesaMutation.status === "pending" ? "Processing..." : "Pay"}
      </button>
    </form>
  );
};

export default StudentFeePaymentFormInline;
