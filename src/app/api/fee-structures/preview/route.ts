import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

export type Term = "TERM1" | "TERM2" | "TERM3";

type ClassFeeStructureRow = { id: number; feeCategoryId: number; term: Term | null; academicYear: number; amount: number };

type PrismaFacade = {
  classFeeStructure: { findMany: (args: { where: { classId: number; academicYear: number; term?: Term | null } }) => Promise<ClassFeeStructureRow[]> };
  student: { findMany: (args: { where: { classId: number }; select: { id: true } }) => Promise<Array<{ id: string }>> };
};

export async function POST(req: NextRequest) {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
    const prisma = (await import('@/lib/prisma')).default;
    const db = prisma as unknown as PrismaFacade;

  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const TermSchema = z.enum(["TERM1", "TERM2", "TERM3"]);
  const PayloadSchema = z
    .object({
      classId: z.number().int().positive(),
      year: z.number().int().min(2000).max(3000),
      scope: z.union([z.literal("all"), z.literal("term")]).optional(),
      term: TermSchema.optional(),
    })
    .strict();

  const parsed = PayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const classId = parsed.data.classId;
  const year = parsed.data.year;
  const scope = parsed.data.scope ?? "all";
  const term = parsed.data.term;
  if (scope === "term" && !term) {
    return NextResponse.json({ error: "term is required when scope=term" }, { status: 400 });
  }

  const students = await db.student.findMany({ where: { classId }, select: { id: true } });
  // structures: if scope is term, include that term plus yearly (term=null) only when term === TERM1 (UI convention).
  const structuresAll = await db.classFeeStructure.findMany({ where: { classId, academicYear: year } });
  const structures = structuresAll.filter((s) => {
    if (scope === "all") return true;
    if (s.term === null) return term === "TERM1"; // yearly lines shown/applied under TERM1
    return s.term === term;
  });

  type PreviewLine = { studentId: string; feeCategoryId: number; term: Term | null; academicYear: number; amount: number; sourceStructureId: number };
  const preview: PreviewLine[] = [];

  for (const stu of students) {
    for (const s of structures) {
      const targetTerm = s.term ?? "TERM1";
      preview.push({ studentId: stu.id, feeCategoryId: s.feeCategoryId, term: targetTerm, academicYear: year, amount: s.amount, sourceStructureId: s.id });
    }
  }

  return NextResponse.json({ data: preview, count: preview.length });
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';