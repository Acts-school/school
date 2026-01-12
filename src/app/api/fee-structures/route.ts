import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Narrowed Prisma surface for ClassFeeStructure to compile before prisma generate
export type Term = "TERM1" | "TERM2" | "TERM3";

type ClassFeeStructureRow = {
  id: number;
  classId: number;
  feeCategoryId: number;
  term: Term | null;
  academicYear: number | null;
  amount: number;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  feeCategory?: { id: number; name: string };
};

type ClassFeeStructureFindManyArgs = {
  where?: { classId?: number; academicYear?: number | null };
  select?: {
    id: true; classId: true; feeCategoryId: true; term: true; academicYear: true; amount: true; active: true; createdAt: true; updatedAt: true;
    feeCategory?: { select: { id: true; name: true } };
  };
  orderBy?: { feeCategoryId: "asc" | "desc" } | { term: "asc" | "desc" } | { id: "asc" | "desc" };
};

type ClassFeeStructureUpsertArgs = {
  where: { classId_feeCategoryId_term_academicYear: { classId: number; feeCategoryId: number; term: Term | null; academicYear: number } };
  update: { amount: number; active: boolean };
  create: { classId: number; feeCategoryId: number; term: Term | null; academicYear: number; amount: number; active: boolean };
  select?: ClassFeeStructureFindManyArgs["select"];
};

type FeeCategoryFindManyArgs = { where?: { id?: { in?: number[] } }; select?: { id: true; name: true } };

type PrismaFacade = {
  classFeeStructure: {
    findMany: (args: ClassFeeStructureFindManyArgs) => Promise<ClassFeeStructureRow[]>;
    upsert: (args: ClassFeeStructureUpsertArgs) => Promise<ClassFeeStructureRow>;
  };
  feeCategory: { findMany: (args: FeeCategoryFindManyArgs) => Promise<Array<{ id: number; name: string }>> };
  auditLog: { create: (args: { data: { actorUserId: string; entity: string; entityId: string; oldValue: unknown; newValue: unknown; reason?: string | null } }) => Promise<unknown> };
  $transaction: <T>(ops: ReadonlyArray<Promise<T>>) => Promise<T[]>;
};

const db = prisma as unknown as PrismaFacade;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const classId = Number(searchParams.get("classId"));
  const year = Number(searchParams.get("year"));

  const where: NonNullable<ClassFeeStructureFindManyArgs["where"]> = {};
  if (!Number.isNaN(classId)) where.classId = classId;
  if (!Number.isNaN(year)) where.academicYear = year;

  const rows = await db.classFeeStructure.findMany({
    where,
    select: {
      id: true,
      classId: true,
      feeCategoryId: true,
      term: true,
      academicYear: true,
      amount: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      feeCategory: { select: { id: true, name: true } },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ data: rows });
}

// Upsert a set of lines for a given class/year
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const TermSchema = z.enum(["TERM1", "TERM2", "TERM3"]);
  const UpsertLineSchema = z
    .object({
      feeCategoryId: z.number().int().nonnegative(),
      term: z.union([TermSchema, z.null()]),
      amountMinor: z.number().int().nonnegative(),
      active: z.boolean().optional(),
    })
    .strict();
  const UpsertPayloadSchema = z
    .object({
      classId: z.number().int().positive(),
      year: z.number().int().min(2000).max(3000),
      lines: z.array(UpsertLineSchema).min(1),
    })
    .strict();

  const parse = UpsertPayloadSchema.safeParse(await req.json());
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid payload", details: parse.error.flatten() }, { status: 400 });
  }

  const { classId, year, lines } = parse.data;

  const ops: Array<Promise<unknown>> = [];
  const results: ClassFeeStructureRow[] = [];

  for (const l of lines) {
    if (!Number.isFinite(l.feeCategoryId) || !Number.isFinite(l.amountMinor)) continue;
    const where = { classId, feeCategoryId: l.feeCategoryId, term: l.term ?? null, academicYear: year } as const;

    // Pre-read current rows (should be 0 or 1 due to unique constraint)
    const existingPromise = db.classFeeStructure.findMany({
      where: { classId: where.classId, academicYear: where.academicYear },
      select: { id: true, classId: true, feeCategoryId: true, term: true, academicYear: true, amount: true, active: true, createdAt: true, updatedAt: true },
    });

    // Perform upsert
    const upsertPromise = db.classFeeStructure.upsert({
      where: { classId_feeCategoryId_term_academicYear: where },
      update: { amount: l.amountMinor, active: l.active ?? true },
      create: { classId, feeCategoryId: l.feeCategoryId, term: l.term ?? null, academicYear: year, amount: l.amountMinor, active: l.active ?? true },
      select: { id: true, classId: true, feeCategoryId: true, term: true, academicYear: true, amount: true, active: true, createdAt: true, updatedAt: true },
    });

    ops.push((async () => {
      const beforeAll = await existingPromise;
      const before = beforeAll.find(r => r.feeCategoryId === where.feeCategoryId && r.term === where.term) ?? null;
      const after = (await upsertPromise) as ClassFeeStructureRow;
      results.push(after);
      await db.auditLog.create({
        data: {
          actorUserId: session.user.id,
          entity: "class_fee_structure",
          entityId: `${classId}:${year}`,
          oldValue: before,
          newValue: { id: after.id, classId: after.classId, feeCategoryId: after.feeCategoryId, term: after.term, academicYear: after.academicYear, amount: after.amount, active: after.active },
        },
      });
      return null as unknown;
    })());
  }

  await db.$transaction(ops);

  return NextResponse.json({ data: results });
}
