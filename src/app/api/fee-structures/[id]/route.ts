import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Narrowed Prisma facade
type Term = "TERM1" | "TERM2" | "TERM3";

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
};

type PrismaFacade = {
  classFeeStructure: {
    findUnique: (args: { where: { id: number }; select: { id: true; classId: true; feeCategoryId: true; term: true; academicYear: true; amount: true; active: true; createdAt: true; updatedAt: true } }) => Promise<ClassFeeStructureRow | null>;
    update: (args: { where: { id: number }; data: { amount?: number; active?: boolean }; select: { id: true; classId: true; feeCategoryId: true; term: true; academicYear: true; amount: true; active: true; createdAt: true; updatedAt: true } }) => Promise<ClassFeeStructureRow>;
  };
  auditLog: { create: (args: { data: { actorUserId: string; entity: string; entityId: string; oldValue: unknown; newValue: unknown; reason?: string | null } }) => Promise<unknown> };
};

const db = prisma as unknown as PrismaFacade;

const PatchSchema = z
  .object({
    amountMinor: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
    reason: z.string().max(500).optional(),
  })
  .strict()
  .refine((o) => typeof o.amountMinor === "number" || typeof o.active === "boolean", {
    message: "Provide at least one field to update (amountMinor or active)",
    path: [],
  });

type RouteParams = {
  id: string | string[] | undefined;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

const toSingleValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await context.params;

  const id = Number.parseInt(toSingleValue(resolvedParams.id) ?? "", 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.classFeeStructure.findUnique({
    where: { id },
    select: { id: true, classId: true, feeCategoryId: true, term: true, academicYear: true, amount: true, active: true, createdAt: true, updatedAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.classFeeStructure.update({
    where: { id },
    data: {
      ...(typeof parsed.data.amountMinor === "number" ? { amount: parsed.data.amountMinor } : {}),
      ...(typeof parsed.data.active === "boolean" ? { active: parsed.data.active } : {}),
    },
    select: { id: true, classId: true, feeCategoryId: true, term: true, academicYear: true, amount: true, active: true, createdAt: true, updatedAt: true },
  });

  // Audit
  await db.auditLog.create({
    data: {
      actorUserId: session.user.id,
      entity: "class_fee_structure",
      entityId: `${existing.classId}:${existing.academicYear ?? ""}`,
      oldValue: existing,
      newValue: { id: updated.id, classId: updated.classId, feeCategoryId: updated.feeCategoryId, term: updated.term, academicYear: updated.academicYear, amount: updated.amount, active: updated.active },
      reason: parsed.data.reason ?? null,
    },
  });

  return NextResponse.json(updated);
}
