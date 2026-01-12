import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Narrowed facade types to avoid dependency on generated Prisma types
type FeeFrequencyLiteral = "TERMLY" | "YEARLY" | "ONE_TIME";

type FeeCategoryRow = { id: number; name: string; active: boolean; frequency: FeeFrequencyLiteral };

type FeeCategoryFindManyArgs = {
  where?: { active?: boolean };
  select?: { id: true; name: true; active: true; frequency: true };
  orderBy?: { name: "asc" | "desc" };
};

type FeeCategoryCreateArgs = {
  data: {
    name: string;
    description?: string | null;
    isRecurring: boolean;
    frequency: FeeFrequencyLiteral;
    isEditable: boolean;
    active: boolean;
  };
  select: { id: true; name: true; active: true; frequency: true };
};

type FeeCategoryUpdateArgs = {
  where: { id: number };
  data: { name?: string; active?: boolean };
  select: { id: true; name: true; active: true; frequency: true };
};

type FeeCategoryFindUniqueArgs = {
  where: { id: number };
  select: { id: true; name: true; active: true; frequency: true };
};

type ClassFeeStructureFindFirstArgs = {
  where: { feeCategoryId: number; active?: boolean };
  select: { id: true };
};

type PrismaFacade = {
  feeCategory: {
    findMany: (args: FeeCategoryFindManyArgs) => Promise<FeeCategoryRow[]>;
    create: (args: FeeCategoryCreateArgs) => Promise<FeeCategoryRow>;
    update: (args: FeeCategoryUpdateArgs) => Promise<FeeCategoryRow>;
    findUnique: (args: FeeCategoryFindUniqueArgs) => Promise<FeeCategoryRow | null>;
  };
  classFeeStructure: {
    findFirst: (args: ClassFeeStructureFindFirstArgs) => Promise<{ id: number } | null>;
  };
};

const db = prisma as unknown as PrismaFacade;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const where: NonNullable<FeeCategoryFindManyArgs["where"]> = {};
  if (activeOnly) where.active = true;

  const rows = await db.feeCategory.findMany({ where, select: { id: true, name: true, active: true, frequency: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ data: rows });
}

const FrequencySchema = z.enum(["TERMLY", "YEARLY", "ONE_TIME"]);

const CreateCategorySchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    frequency: FrequencySchema,
  })
  .strict();

const PatchCategorySchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(100).optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((payload) => typeof payload.name === "string" || typeof payload.active === "boolean", {
    message: "Provide at least one field to update (name or active)",
    path: [],
  });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CreateCategorySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, frequency } = parsed.data;
  const isRecurring = frequency !== "ONE_TIME";

  try {
    const created = await db.feeCategory.create({
      data: {
        name,
        ...(typeof description === "string" && description.trim().length > 0 ? { description } : {}),
        isRecurring,
        frequency,
        isEditable: true,
        active: true,
      },
      select: { id: true, name: true, active: true, frequency: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (_error: unknown) {
    return NextResponse.json({ error: "Failed to create fee category" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = PatchCategorySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id, name, active } = parsed.data;

  const existing = await db.feeCategory.findUnique({ where: { id }, select: { id: true, name: true, active: true, frequency: true } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (active === false) {
    const linked = await db.classFeeStructure.findFirst({
      where: { feeCategoryId: id, active: true },
      select: { id: true },
    });
    if (linked) {
      return NextResponse.json({ error: "Cannot deactivate fee category while active class fee structures reference it" }, { status: 400 });
    }
  }

  try {
    const updated = await db.feeCategory.update({
      where: { id },
      data: {
        ...(typeof name === "string" ? { name } : {}),
        ...(typeof active === "boolean" ? { active } : {}),
      },
      select: { id: true, name: true, active: true, frequency: true },
    });

    return NextResponse.json(updated);
  } catch (_error: unknown) {
    return NextResponse.json({ error: "Failed to update fee category" }, { status: 500 });
  }
}
