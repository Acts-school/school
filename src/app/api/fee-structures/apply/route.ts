import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { z } from "zod";

export type Term = "TERM1" | "TERM2" | "TERM3";

type ClassFeeStructureRow = { id: number; feeCategoryId: number; term: Term | null; academicYear: number; amount: number };

type StudentFeeRow = {
  id: string;
  studentId: string;
  feeCategoryId: number | null;
  term: Term | null;
  academicYear: number | null;
  baseAmount: number | null;
  amountDue: number;
  amountPaid: number;
  locked: boolean;
};

type PrismaFacade = {
  classFeeStructure: { findMany: (args: { where: { classId: number; academicYear: number } }) => Promise<ClassFeeStructureRow[]> };
  student: { findMany: (args: { where: { classId: number }; select: { id: true } }) => Promise<Array<{ id: string }>> };
  studentFee: {
    findFirst: (args: { where: { studentId: string; feeCategoryId: number; term: Term | null; academicYear: number } }) => Promise<StudentFeeRow | null>;
    create: (args: {
      data: {
        studentId: string;
        feeCategoryId: number;
        term: Term | null;
        academicYear: number;
        baseAmount: number | null;
        amountDue: number;
        amountPaid: number;
        locked: boolean;
        sourceStructureId: number | null;
        status: string;
      };
    }) => Promise<StudentFeeRow>;
    update: (args: {
      where: { id: string };
      data: Partial<
        Omit<
          StudentFeeRow,
          | "id"
          | "studentId"
          | "feeCategoryId"
          | "term"
          | "academicYear"
        >
      > & { sourceStructureId?: number | null; status?: string };
    }) => Promise<StudentFeeRow>;
  };
  auditLog: { create: (args: { data: { actorUserId: string; entity: string; entityId: string; oldValue: unknown; newValue: unknown; reason?: string | null } }) => Promise<unknown> };
  $transaction: <T>(ops: ReadonlyArray<Promise<T>>) => Promise<T[]>;
};

const db = prisma as unknown as PrismaFacade;

export async function POST(req: NextRequest) {
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
      reason: z.string().max(500).optional(),
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
  const reason = parsed.data.reason;
  if (scope === "term" && !term) {
    return NextResponse.json({ error: "term is required when scope=term" }, { status: 400 });
  }

  const students = await db.student.findMany({ where: { classId }, select: { id: true } });
  const structuresAll = await db.classFeeStructure.findMany({ where: { classId, academicYear: year } });
  const structures = structuresAll.filter((s) => {
    if (scope === "all") return true;
    if (s.term === null) return term === "TERM1"; // yearly applied under TERM1
    return s.term === term;
  });

  const ops: Array<Promise<unknown>> = [];

  for (const stu of students) {
    for (const s of structures) {
      const targetTerm = (s.term ?? "TERM1") as Term;
      ops.push((async () => {
        const existing = await db.studentFee.findFirst({ where: { studentId: stu.id, feeCategoryId: s.feeCategoryId, term: targetTerm, academicYear: year } });
        if (!existing) {
          const status = s.amount <= 0 ? "paid" : "unpaid";
          return db.studentFee.create({
            data: {
              studentId: stu.id,
              feeCategoryId: s.feeCategoryId,
              term: targetTerm,
              academicYear: year,
              baseAmount: s.amount,
              amountDue: s.amount,
              amountPaid: 0,
              locked: false,
              sourceStructureId: s.id,
              status,
            },
          });
        }
        // If already paid more than new amount, lock and keep paid as-is
        if (existing.amountPaid > s.amount) {
          return db.studentFee.update({
            where: { id: existing.id },
            data: {
              locked: true,
              sourceStructureId: s.id,
              baseAmount: s.amount,
              amountDue: s.amount,
              status: "paid",
            },
          });
        }
        // If locked, do not change monetary values; just keep link to source
        if (existing.locked) {
          return db.studentFee.update({ where: { id: existing.id }, data: { sourceStructureId: s.id } });
        }
        const newStatus = existing.amountPaid === s.amount ? "paid" : existing.amountPaid > 0 ? "partially_paid" : "unpaid";
        return db.studentFee.update({
          where: { id: existing.id },
          data: {
            baseAmount: s.amount,
            amountDue: s.amount,
            status: newStatus,
            sourceStructureId: s.id,
          },
        });
      })());
    }
  }

  // Audit log
  ops.push(db.auditLog.create({ data: { actorUserId: session.user.id, entity: "fee_structure_apply", entityId: `${classId}:${year}:${scope}:${term ?? "-"}`, oldValue: null, newValue: { classId, year, scope, term }, reason: reason ?? null } }));

  await db.$transaction(ops);

  return NextResponse.json({ ok: true });
}
