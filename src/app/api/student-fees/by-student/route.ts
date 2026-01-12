import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import type { TermLiteral } from "@/lib/schoolSettings";

interface StudentFeesByStudentItem {
  id: string;
  name: string | null;
  amountDue: number;
  amountPaid: number;
  status: string;
  term: TermLiteral | null;
  academicYear: number | null;
}

interface StudentFeesByStudentResponse {
  data: StudentFeesByStudentItem[];
}

export async function GET(
  req: NextRequest,
): Promise<NextResponse<StudentFeesByStudentResponse | { error: string }>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const termParam = searchParams.get("term");
    const yearParam = searchParams.get("year");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    let termFilter: TermLiteral | null = null;
    if (termParam) {
      if (termParam === "TERM1" || termParam === "TERM2" || termParam === "TERM3") {
        termFilter = termParam;
      } else {
        return NextResponse.json({ error: "Invalid term" }, { status: 400 });
      }
    }

    let yearFilter: number | null = null;
    if (yearParam) {
      const parsedYear = Number.parseInt(yearParam, 10);
      if (Number.isNaN(parsedYear)) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
      }
      yearFilter = parsedYear;
    }

    const where = {
      studentId,
      ...(termFilter ? { term: termFilter } : {}),
      ...(yearFilter !== null ? { academicYear: yearFilter } : {}),
    } as const;

    const rows = await prisma.studentFee.findMany({
      where,
      select: {
        id: true,
        amountDue: true,
        amountPaid: true,
        status: true,
        term: true,
        academicYear: true,
        structure: {
          select: {
            name: true,
          },
        },
        feeCategory: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const data: StudentFeesByStudentItem[] = rows.map((row) => ({
      id: row.id,
      name: row.structure?.name ?? row.feeCategory?.name ?? null,
      amountDue: row.amountDue,
      amountPaid: row.amountPaid,
      status: row.status,
      term: (row.term as TermLiteral | null) ?? null,
      academicYear: row.academicYear ?? null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching student fees by student:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

