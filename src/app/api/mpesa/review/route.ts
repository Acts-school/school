import { NextRequest, NextResponse } from "next/server";

import type { MpesaTransactionStatus } from "@prisma/client";

type MpesaReviewReasonLocal = "NO_STUDENT" | "MULTIPLE_STUDENTS" | "NO_FEES" | "OTHER";

interface MpesaReviewItem {
  id: number;
  studentFeeId: string | null;
  amount: number;
  phoneNumber: string;
  mpesaReceiptNumber: string | null;
  createdAt: Date;
  status: MpesaTransactionStatus;
  reviewReason: MpesaReviewReasonLocal | null;
}

export async function GET(
  req: NextRequest,
): Promise<NextResponse<{ data: MpesaReviewItem[] } | { error: string }>> {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
  const prisma = (await import('@/lib/prisma')).default;
  
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;

    if (role !== "admin" && role !== "accountant") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const takeParam = searchParams.get("take");
    const take = Math.min(Math.max(Number(takeParam) || 50, 1), 200);

    const transactions = await prisma.mpesaTransaction.findMany({
      where: {
        status: "PENDING" as MpesaTransactionStatus,
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    const data: MpesaReviewItem[] = transactions.map((t) => ({
      id: t.id,
      studentFeeId: t.studentFeeId,
      amount: t.amount,
      phoneNumber: t.phoneNumber,
      mpesaReceiptNumber: t.mpesaReceiptNumber ?? null,
      createdAt: t.createdAt,
      status: t.status,
      reviewReason: t.reviewReason ?? null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching Mpesa transactions for review:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';