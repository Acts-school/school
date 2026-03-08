import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { getFeeStructuresRepository, type Term, type UpsertLine, type UpsertPayload } from "@/server/feeStructuresRepository";

export async function GET(req: NextRequest) {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;

  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const classId = Number(searchParams.get("classId"));
  const year = Number(searchParams.get("year"));

  const query: { classId?: number; academicYear?: number | null } = {};
  if (!Number.isNaN(classId)) query.classId = classId;
  if (!Number.isNaN(year)) query.academicYear = year;

  const feeStructuresRepo = await getFeeStructuresRepository();
  const rows = await feeStructuresRepo.list(query);

  return NextResponse.json({ data: rows });
}

// Upsert a set of lines for a given class/year
export async function POST(req: NextRequest) {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;

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

  const feeStructuresRepo = await getFeeStructuresRepository();
  const results = await feeStructuresRepo.upsert(
    { classId, year, lines },
    session.user.id
  );

  return NextResponse.json({ data: results });
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';