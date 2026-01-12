import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import type { BaseRole } from "@/lib/rbac";

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

interface StudentFeeSummaryRow {
  amountDue: number;
  amountPaid: number;
  term: TermLiteral | null;
  academicYear: number | null;
  createdAt: Date;
}

type StudentFeeSummaryWhereInput = {
  studentId?: string;
  student?: {
    parentId?: string;
    class?: {
      supervisorId?: string;
    };
  };
};

type StudentFeeSummaryFindManyArgs = {
  where: StudentFeeSummaryWhereInput;
  select: {
    amountDue: true;
    amountPaid: true;
    term: true;
    academicYear: true;
    createdAt: true;
  };
};

type StudentFeeSummaryPrisma = {
  studentFee: {
    findMany: (args: StudentFeeSummaryFindManyArgs) => Promise<StudentFeeSummaryRow[]>;
  };
};

const studentFeeSummaryPrisma = prisma as unknown as StudentFeeSummaryPrisma;

interface MyStudentFeesSummaryResponse {
  term: TermLiteral | null;
  year: number | null;
  totalDue: number;
  totalPaidRaw: number;
  pastCredit: number;
  effectivePaid: number;
  balance: number;
  rolloverForward: number;
}

const termOrder = (term: TermLiteral | null): number => {
  if (term === "TERM1") return 1;
  if (term === "TERM2") return 2;
  if (term === "TERM3") return 3;
  return 0;
};

const getYear = (row: StudentFeeSummaryRow): number => {
  if (typeof row.academicYear === "number") return row.academicYear;
  return row.createdAt.getFullYear();
};

export async function GET(
  req: NextRequest,
): Promise<NextResponse<MyStudentFeesSummaryResponse | { error: string }>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as BaseRole;
    const userId = session.user.id;

    // Only student, parent, and teacher use the my-fees views
    if (role !== "student" && role !== "parent" && role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const termParam = searchParams.get("term");
    const studentIdParam = searchParams.get("studentId");

    let targetTerm: TermLiteral | null = null;
    if (termParam) {
      if (termParam === "TERM1" || termParam === "TERM2" || termParam === "TERM3") {
        targetTerm = termParam;
      } else {
        return NextResponse.json({ error: "Invalid term" }, { status: 400 });
      }
    }

    let whereBase: StudentFeeSummaryWhereInput;

    if (role === "student") {
      whereBase = { studentId: userId };
    } else if (role === "parent") {
      // Parent can optionally narrow to a specific child; we still include parentId constraint for safety.
      whereBase = {
        ...(studentIdParam ? { studentId: studentIdParam } : {}),
        student: { parentId: userId },
      };
    } else {
      // teacher
      whereBase = {
        ...(studentIdParam ? { studentId: studentIdParam } : {}),
        student: { class: { supervisorId: userId } },
      };
    }

    const rows = await studentFeeSummaryPrisma.studentFee.findMany({
      where: whereBase,
      select: {
        amountDue: true,
        amountPaid: true,
        term: true,
        academicYear: true,
        createdAt: true,
      },
    });

    if (rows.length === 0) {
      const empty: MyStudentFeesSummaryResponse = {
        term: targetTerm,
        year: null,
        totalDue: 0,
        totalPaidRaw: 0,
        pastCredit: 0,
        effectivePaid: 0,
        balance: 0,
        rolloverForward: 0,
      };
      return NextResponse.json(empty);
    }

    // Determine current year based on data and optional target term
    let currentTerm: TermLiteral | null = targetTerm;

    let currentYear: number | null = null;
    if (currentTerm) {
      const sameTermRows = rows.filter((r) => r.term === currentTerm);
      if (sameTermRows.length > 0) {
        currentYear = sameTermRows.reduce((maxYear, r) => {
          const y = getYear(r);
          return y > maxYear ? y : maxYear;
        }, getYear(sameTermRows[0]!));
      } else {
        // Fallback: latest year overall
        currentYear = rows.reduce((maxYear, r) => {
          const y = getYear(r);
          return y > maxYear ? y : maxYear;
        }, getYear(rows[0]!));
      }
    } else {
      // No specific term: use latest year overall
      currentYear = rows.reduce((maxYear, r) => {
        const y = getYear(r);
        return y > maxYear ? y : maxYear;
      }, getYear(rows[0]!));
    }

    if (currentYear === null) {
      const empty: MyStudentFeesSummaryResponse = {
        term: currentTerm,
        year: null,
        totalDue: 0,
        totalPaidRaw: 0,
        pastCredit: 0,
        effectivePaid: 0,
        balance: 0,
        rolloverForward: 0,
      };
      return NextResponse.json(empty);
    }

    const currentRows: StudentFeeSummaryRow[] = [];
    const pastRows: StudentFeeSummaryRow[] = [];

    rows.forEach((row) => {
      const rowYear = getYear(row);
      if (rowYear > currentYear!) {
        // Future rows are ignored for rollover purposes
        return;
      }

      const rowTerm = row.term;

      if (currentTerm) {
        if (rowYear === currentYear && rowTerm === currentTerm) {
          currentRows.push(row);
          return;
        }

        const isPastYear = rowYear < currentYear;
        const isSameYearEarlierTerm =
          rowYear === currentYear && termOrder(rowTerm) < termOrder(currentTerm);

        if (isPastYear || isSameYearEarlierTerm) {
          pastRows.push(row);
        }
      } else {
        // No specific term: current year vs previous years
        if (rowYear === currentYear) {
          currentRows.push(row);
        } else if (rowYear < currentYear) {
          pastRows.push(row);
        }
      }
    });

    const totalDue = currentRows.reduce((sum, r) => sum + r.amountDue, 0);
    const totalPaidRaw = currentRows.reduce((sum, r) => sum + r.amountPaid, 0);

    const pastCredit = pastRows.reduce((sum, r) => {
      const extra = r.amountPaid - r.amountDue;
      return extra > 0 ? sum + extra : sum;
    }, 0);

    const effectivePaid = totalPaidRaw + pastCredit;
    const balance = totalDue > effectivePaid ? totalDue - effectivePaid : 0;
    const rolloverForward = effectivePaid > totalDue ? effectivePaid - totalDue : 0;

    const responseBody: MyStudentFeesSummaryResponse = {
      term: currentTerm,
      year: currentYear,
      totalDue,
      totalPaidRaw,
      pastCredit,
      effectivePaid,
      balance,
      rolloverForward,
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error computing my student fees summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
