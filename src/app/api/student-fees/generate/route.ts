import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

interface GenerateStudentFeesBody {
  structureId: number;
  scope: "grade" | "class";
  gradeId?: number;
  classId?: number;
  dueDate?: string;
  term?: TermLiteral;
  academicYear?: number;
}

interface GenerateStudentFeesResponse {
  createdCount: number;
  skippedCount: number;
  totalTargeted: number;
}

type StudentFeeCreateManyInput = {
  studentId: string;
  structureId: number;
  amountDue: number;
  amountPaid?: number;
  dueDate?: Date | null;
  status?: string;
  term?: TermLiteral;
  academicYear?: number;
};

type StudentFeeGeneratePrisma = {
  studentFee: {
    createMany: (args: { data: StudentFeeCreateManyInput[] }) => Promise<{ count: number }>;
    findMany: (args: unknown) => Promise<Array<{ studentId: string }>>;
  };
  student: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>;
  };
  feeStructure: {
    findUnique: (args: unknown) => Promise<{ id: number; amount: number; gradeId: number | null; classId: number | null } | null>;
  };
};

const studentFeeGeneratePrisma = prisma as unknown as StudentFeeGeneratePrisma;

const parseBody = (body: unknown): GenerateStudentFeesBody | null => {
  if (!body || typeof body !== "object") return null;
  const value = body as Partial<GenerateStudentFeesBody>;

  if (typeof value.structureId !== "number") return null;
  if (value.scope !== "grade" && value.scope !== "class") return null;

  if (value.gradeId !== undefined && typeof value.gradeId !== "number") return null;
  if (value.classId !== undefined && typeof value.classId !== "number") return null;
  if (value.dueDate !== undefined && typeof value.dueDate !== "string") return null;
  if (
    value.term !== undefined &&
    value.term !== "TERM1" &&
    value.term !== "TERM2" &&
    value.term !== "TERM3"
  ) {
    return null;
  }
  if (value.academicYear !== undefined && typeof value.academicYear !== "number") return null;

  return {
    structureId: value.structureId,
    scope: value.scope,
    ...(typeof value.gradeId === "number" ? { gradeId: value.gradeId } : {}),
    ...(typeof value.classId === "number" ? { classId: value.classId } : {}),
    ...(typeof value.dueDate === "string" ? { dueDate: value.dueDate } : {}),
    ...(value.term ? { term: value.term } : {}),
    ...(typeof value.academicYear === "number" ? { academicYear: value.academicYear } : {}),
  };
};

export async function POST(
  req: NextRequest,
): Promise<NextResponse<GenerateStudentFeesResponse | { error: string }>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await req.json().catch(() => null);
    const body = parseBody(rawBody);

    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const structure = await studentFeeGeneratePrisma.feeStructure.findUnique({
      where: { id: body.structureId },
      select: { id: true, amount: true, gradeId: true, classId: true },
    });

    if (!structure) {
      return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
    }

    let targetClassId: number | null = null;
    let targetGradeId: number | null = null;

    if (body.scope === "class") {
      if (typeof body.classId === "number") {
        targetClassId = body.classId;
      } else if (typeof structure.classId === "number") {
        targetClassId = structure.classId;
      } else {
        return NextResponse.json({ error: "classId is required for class scope" }, { status: 400 });
      }
    } else {
      if (typeof body.gradeId === "number") {
        targetGradeId = body.gradeId;
      } else if (typeof structure.gradeId === "number") {
        targetGradeId = structure.gradeId;
      } else {
        return NextResponse.json({ error: "gradeId is required for grade scope" }, { status: 400 });
      }
    }

    const studentWhere = targetClassId !== null
      ? { classId: targetClassId }
      : { gradeId: targetGradeId };

    const students = await studentFeeGeneratePrisma.student.findMany({
      where: studentWhere,
      select: { id: true },
    });

    if (students.length === 0) {
      return NextResponse.json({ createdCount: 0, skippedCount: 0, totalTargeted: 0 });
    }

    const studentIds = students.map((s) => s.id);

    const existingFees = await studentFeeGeneratePrisma.studentFee.findMany({
      where: {
        structureId: structure.id,
        studentId: { in: studentIds },
      },
      select: { studentId: true },
    });

    const existingSet = new Set(existingFees.map((f) => f.studentId));

    const dueDate: Date | null = body.dueDate ? new Date(body.dueDate) : null;

    const rows: StudentFeeCreateManyInput[] = studentIds
      .filter((id) => !existingSet.has(id))
      .map((id) => ({
        studentId: id,
        structureId: structure.id,
        amountDue: structure.amount,
        amountPaid: 0,
        dueDate,
        status: "unpaid",
        ...(body.term ? { term: body.term } : {}),
        ...(typeof body.academicYear === "number"
          ? { academicYear: body.academicYear }
          : {}),
      }));

    if (rows.length === 0) {
      return NextResponse.json({
        createdCount: 0,
        skippedCount: studentIds.length,
        totalTargeted: studentIds.length,
      });
    }

    const result = await studentFeeGeneratePrisma.studentFee.createMany({
      data: rows,
    });

    const createdCount = result.count;
    const skippedCount = studentIds.length - createdCount;

    return NextResponse.json({
      createdCount,
      skippedCount,
      totalTargeted: studentIds.length,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error generating student fees:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
