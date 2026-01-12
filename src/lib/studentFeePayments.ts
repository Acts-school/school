import prisma from "@/lib/prisma";
import type { Payment, StudentFee, PaymentMethod as DbPaymentMethod } from "@prisma/client";
import type { PaymentMethod as InputPaymentMethod } from "@/lib/fees.actions";

export type StudentFeeStatus = "unpaid" | "partially_paid" | "paid";

export interface ApplyStudentFeePaymentInput {
  studentFeeId: string;
  amountMinor: number;
  method: InputPaymentMethod;
  reference?: string | null;
  clientRequestId?: string | null;
  createdFromOffline?: boolean;
}

export interface ApplyStudentFeePaymentResult {
  payment: Payment;
  studentFee: StudentFee;
}

const computeStudentFeeStatus = (amountDue: number, amountPaid: number): StudentFeeStatus => {
  if (amountPaid <= 0) {
    return amountDue <= 0 ? "paid" : "unpaid";
  }

  if (amountPaid >= amountDue) {
    return "paid";
  }

  return "partially_paid";
};

export const applyStudentFeePayment = async (
  input: ApplyStudentFeePaymentInput,
): Promise<ApplyStudentFeePaymentResult> => {
  const { studentFeeId, amountMinor, method, reference, clientRequestId, createdFromOffline } = input;

  const fee = await prisma.studentFee.findUnique({
    where: { id: studentFeeId },
    select: {
      id: true,
      amountDue: true,
      amountPaid: true,
    },
  });

  if (!fee) {
    throw new Error("Student fee not found");
  }

  const newAmountPaid = fee.amountPaid + amountMinor;
  const status = computeStudentFeeStatus(fee.amountDue, newAmountPaid);

  const dbMethod = method as unknown as DbPaymentMethod;

  const [payment, updatedFee] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        studentFeeId,
        amount: amountMinor,
        method: dbMethod,
        reference: reference ?? null,
        clientRequestId: clientRequestId ?? null,
        createdFromOffline: createdFromOffline ?? false,
      },
    }),
    prisma.studentFee.update({
      where: { id: studentFeeId },
      data: {
        amountPaid: newAmountPaid,
        status,
      },
    }),
  ]);

  return {
    payment,
    studentFee: updatedFee,
  };
};
