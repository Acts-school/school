import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { ReceiptDocument } from "@/lib/pdf/ReceiptDocument";
import { renderToBuffer } from "@react-pdf/renderer";

const paramsSchema = z.object({
  paymentId: z.string().regex(/^\d+$/),
});

type RouteParams = {
  paymentId: string | string[] | undefined;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

const toSingleValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export async function GET(
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await context.params;

  const parsedParams = paramsSchema.safeParse({
    paymentId: toSingleValue(resolvedParams.paymentId),
  });
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }

  const paymentIdNumber = Number.parseInt(parsedParams.data.paymentId, 10);

  const role = session.user.role;
  const userId = session.user.id;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentIdNumber },
      include: {
        studentFee: {
          select: {
            amountDue: true,
            amountPaid: true,
            term: true,
            academicYear: true,
            student: {
              select: {
                id: true,
                username: true,
                name: true,
                surname: true,
                class: { select: { name: true } },
                grade: { select: { level: true } },
                parentId: true,
              },
            },
          },
        },
      },
    });

    if (!payment || !payment.studentFee || !payment.studentFee.student) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const student = payment.studentFee.student;

    if (role === "parent" && student.parentId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (role !== "admin" && role !== "accountant" && role !== "parent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const settings = await prisma.schoolSettings.findUnique({ where: { id: 1 } });
    const schoolName = settings?.schoolName ?? "School";

    const fee = payment.studentFee;
    const academicYear =
      fee?.academicYear ?? settings?.currentAcademicYear ?? null;
    const term = fee?.term ?? settings?.currentTerm ?? null;

    const totalAmountMinor = fee?.amountDue ?? payment.amount;
    const paidAmountMinor = fee?.amountPaid ?? payment.amount;
    const balanceMinor = Math.max((fee?.amountDue ?? 0) - (fee?.amountPaid ?? 0), 0);

    const termLabel = (() => {
      if (!term) return null;
      if (term === "TERM1") return "Term 1";
      if (term === "TERM2") return "Term 2";
      if (term === "TERM3") return "Term 3";
      return String(term);
    })();

    const element = ReceiptDocument({
      schoolName,
      payment: {
        id: payment.id,
        amountMinor: payment.amount,
        method: payment.method,
        reference: payment.reference ?? null,
        paidAt: payment.paidAt,
      },
      student: {
        name: student.name,
        surname: student.surname,
        username: student.username,
        className: student.class?.name ?? null,
        gradeLevel: student.grade?.level ?? null,
      },
      academicYear,
      termLabel,
      totalAmountMinor,
      paidAmountMinor,
      balanceMinor,
    });

    const buffer = await renderToBuffer(element);
    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=receipt-${payment.id}.pdf`,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error generating receipt PDF:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
