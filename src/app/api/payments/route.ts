import { NextRequest, NextResponse } from "next/server";

import { studentFeePaymentSchema } from "@/lib/formValidationSchemas";
import type { PaymentMethod } from "@/lib/fees.actions";
import { getPaymentsRepository, type CreatePaymentPayload } from "@/server/paymentsRepository";

interface PaymentListItem {
  id: number;
  studentFeeId: string | null;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paidAt: Date;
}

const generateCashReference = (studentFeeId: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;
  const suffix = studentFeeId.slice(-6);
  return `CASH-${datePart}-${suffix}`;
};

export async function GET(req: NextRequest): Promise<NextResponse<{ data: PaymentListItem[] } | { error: string }>> {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
  
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentFeeId = searchParams.get("studentFeeId");

    if (!studentFeeId) {
      return NextResponse.json({ error: "studentFeeId is required" }, { status: 400 });
    }

    const paymentsRepo = await getPaymentsRepository();
    const payments = await paymentsRepo.list({ studentFeeId });

    return NextResponse.json({ data: payments });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<PaymentListItem | { error: string }>> {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
  
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    const userId = session.user.id;

    if (role !== "admin" && role !== "accountant" && role !== "parent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = studentFeePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { studentFeeId, amount, method, reference, clientRequestId } = parsed.data;

    const paymentsRepo = await getPaymentsRepository();
    
    // Check for duplicate client request ID
    if (clientRequestId) {
      const existing = await paymentsRepo.findByClientRequestId(clientRequestId);
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    // Verify student fee and permissions
    const fee = await paymentsRepo.findStudentFeeForPayment(studentFeeId);
    if (!fee) {
      return NextResponse.json({ error: "Student fee not found" }, { status: 404 });
    }

    if (role === "parent" && fee.student.parentId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const trimmedReference = typeof reference === "string" ? reference.trim() : "";

    let finalReference: string;

    if (method === "CASH") {
      finalReference = trimmedReference || generateCashReference(studentFeeId);
    } else {
      if (!trimmedReference) {
        return NextResponse.json(
          { error: "Reference is required for non-cash payments" },
          { status: 400 },
        );
      }
      finalReference = trimmedReference;
    }

    const createPayload: CreatePaymentPayload = {
      studentFeeId,
      amount,
      method,
      reference: finalReference,
      clientRequestId: clientRequestId ?? null,
      createdFromOffline: Boolean(clientRequestId),
      userId,
      userRole: role,
    };

    const { payment } = await paymentsRepo.create(createPayload);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating payment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';