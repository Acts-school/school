import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { getFeeCategoriesRepository, type CreateFeeCategoryPayload, type UpdateFeeCategoryPayload } from "@/server/feeCategoriesRepository";

export async function GET(req: NextRequest) {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const feeCategoriesRepo = await getFeeCategoriesRepository();
  const rows = await feeCategoriesRepo.list({ activeOnly });
  
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
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
  const { NextResponse } = await import('next/server');

  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CreateCategorySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, frequency } = parsed.data;

  try {
    const feeCategoriesRepo = await getFeeCategoriesRepository();
    const created = await feeCategoriesRepo.create({ 
      name, 
      description: description || null, 
      frequency 
    });

    return NextResponse.json(created, { status: 201 });
  } catch (_error: unknown) {
    return NextResponse.json({ error: "Failed to create fee category" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
  const { NextResponse } = await import('next/server');

  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = PatchCategorySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id, name, active } = parsed.data;

  try {
    const feeCategoriesRepo = await getFeeCategoriesRepository();
    
    // Check if category exists
    const existing = await feeCategoriesRepo.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if trying to deactivate but has active fee structures
    if (active === false) {
      const hasActiveStructures = await feeCategoriesRepo.hasActiveFeeStructures(id);
      if (hasActiveStructures) {
        return NextResponse.json({ error: "Cannot deactivate fee category while active class fee structures reference it" }, { status: 400 });
      }
    }

    const updatePayload: UpdateFeeCategoryPayload = { id };
    if (typeof name === "string") updatePayload.name = name;
    if (typeof active === "boolean") updatePayload.active = active;

    const updated = await feeCategoriesRepo.update(updatePayload);
    return NextResponse.json(updated);
  } catch (_error: unknown) {
    return NextResponse.json({ error: "Failed to update fee category" }, { status: 500 });
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';