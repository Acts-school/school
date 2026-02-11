import { NextRequest, NextResponse } from "next/server";
import type { PaymentMethod as DbPaymentMethod } from "@prisma/client";

import { multiStudentFeePaymentSchema } from "@/lib/formValidationSchemas";

type StudentFeeStatus = "unpaid" | "partially_paid" | "paid";

const computeStudentFeeStatus = (amountDue: number, amountPaid: number): StudentFeeStatus => {
  if (amountPaid <= 0) {
    return amountDue <= 0 ? "paid" : "unpaid";
  }

  if (amountPaid >= amountDue) {
    return "paid";
  }

  return "partially_paid";
};

const generateCashReference = (studentFeeId: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;
  const suffix = studentFeeId.slice(-6);
  return `CASH-${datePart}-${suffix}`;
};

export async function POST(
  req: NextRequest,
): Promise<
  NextResponse<
    | {
        payment: {
          id: number;
          amount: number;
          method: string;
          reference: string | null;
          paidAt: string;
        };
        allocations: Array<{
          id: number;
          studentFeeId: string;
          amount: number;
        }>;
      }
    | { error: string }
  >
> {
  const [{ getServerSession }, { authOptions }, { default: prisma }] = await Promise.all([
    import("next-auth"),
    import("@/pages/api/auth/[...nextauth]"),
    import("@/lib/prisma"),
  ]);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;

    if (role !== "admin" && role !== "accountant") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = multiStudentFeePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { studentId, method, reference, clientRequestId, allocations } = parsed.data;

    const trimmedReference = typeof reference === "string" ? reference.trim() : "";

    const allocationIds = allocations.map((a) => a.studentFeeId);

    const fees = await prisma.studentFee.findMany({
      where: { id: { in: allocationIds } },
      select: {
        id: true,
        studentId: true,
        amountDue: true,
        amountPaid: true,
      },
    });

    if (fees.length !== allocations.length) {
      return NextResponse.json({ error: "One or more student fees were not found" }, { status: 400 });
    }

    const feeById = new Map<string, (typeof fees)[number]>();
    for (const fee of fees) {
      feeById.set(fee.id, fee);
    }

    for (const allocation of allocations) {
      const fee = feeById.get(allocation.studentFeeId);
      if (!fee) {
        return NextResponse.json({ error: "One or more student fees were not found" }, { status: 400 });
      }
      if (fee.studentId !== studentId) {
        return NextResponse.json({ error: "All allocations must belong to the same student" }, { status: 400 });
      }
    }

    const allocationsMinor = allocations.map(({ studentFeeId, amount }) => {
      const fee = feeById.get(studentFeeId)!;
      const amountMinor = Math.round(amount * 100);
      const outstanding = fee.amountDue - fee.amountPaid;

      if (amountMinor <= 0) {
        throw new Error("Allocation amount must be positive");
      }

      if (amountMinor > outstanding) {
        throw new Error("Allocation exceeds outstanding balance for one of the fees");
      }

      return { studentFeeId, amountMinor };
    });

    const totalMinor = allocationsMinor.reduce((sum, a) => sum + a.amountMinor, 0);

    if (totalMinor <= 0) {
      return NextResponse.json({ error: "Total amount must be positive" }, { status: 400 });
    }

    let finalReference: string;

    if (method === "CASH") {
      const primaryFeeId = allocations[0]?.studentFeeId;
      if (!trimmedReference && primaryFeeId) {
        finalReference = generateCashReference(primaryFeeId);
      } else {
        finalReference = trimmedReference || generateCashReference(primaryFeeId ?? "MULTI");
      }
    } else {
      if (!trimmedReference) {
        return NextResponse.json(
          { error: "Reference is required for non-cash payments" },
          { status: 400 },
        );
      }
      finalReference = trimmedReference;
    }

    const dbMethod = method as unknown as DbPaymentMethod;

    const payment = await prisma.$transaction(async (tx) => {
      const freshFees = await tx.studentFee.findMany({
        where: { id: { in: allocationIds } },
        select: {
          id: true,
          amountDue: true,
          amountPaid: true,
        },
      });

      const freshById = new Map<string, (typeof freshFees)[number]>();
      for (const fee of freshFees) {
        freshById.set(fee.id, fee);
      }

      const paymentRecord = await tx.payment.create({
        data: {
          studentFeeId: allocations[0]?.studentFeeId ?? null,
          amount: totalMinor,
          method: dbMethod,
          reference: finalReference,
          clientRequestId: clientRequestId ?? null,
          createdFromOffline: Boolean(clientRequestId),
          allocations: {
            create: allocationsMinor.map((a) => ({
              studentFeeId: a.studentFeeId,
              amount: a.amountMinor,
            })),
          },
        },
        include: {
          allocations: true,
        },
      });

      const updates = allocationsMinor.map((allocation) => {
        const fee = freshById.get(allocation.studentFeeId);
        if (!fee) {
          throw new Error("Student fee not found during update");
        }
        const newAmountPaid = fee.amountPaid + allocation.amountMinor;
        const status = computeStudentFeeStatus(fee.amountDue, newAmountPaid);
        return { id: fee.id, newAmountPaid, status };
      });

      for (const u of updates) {
        await tx.studentFee.update({
          where: { id: u.id },
          data: {
            amountPaid: u.newAmountPaid,
            status: u.status,
          },
        });
      }

      return paymentRecord;
    });

    return NextResponse.json(
      {
        payment: {
          id: payment.id,
          amount: payment.amount,
          method: method,
          reference: payment.reference ?? null,
          paidAt: payment.paidAt.toISOString(),
        },
        allocations: payment.allocations.map((a) => ({
          id: a.id,
          studentFeeId: a.studentFeeId,
          amount: a.amount,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
