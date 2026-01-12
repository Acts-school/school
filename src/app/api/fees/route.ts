import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { feeStructureSchema } from "@/lib/formValidationSchemas";

interface FeeStructureListItem {
  id: number;
  name: string;
  description: string | null;
  amount: number;
  active: boolean;
  class: { id: number; name: string } | null;
  _count: { studentFees: number };
}

interface ApiResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type FeeStructurePrisma = {
  feeStructure: {
    findMany: (args: unknown) => Promise<FeeStructureListItem[]>;
    count: (args: unknown) => Promise<number>;
    create: (args: unknown) => Promise<FeeStructureListItem>;
  };
  $transaction: (ops: ReadonlyArray<Promise<unknown>>) => Promise<Array<unknown>>;
};

const feePrisma = prisma as unknown as FeeStructurePrisma;

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<FeeStructureListItem> | { error: string }>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;
    const search = searchParams.get("search") ?? "";
    const classIdParam = searchParams.get("classId");
    const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10) || 10;
    const offset = (page - 1) * limit;

    const classId = classIdParam ? Number(classIdParam) : Number.NaN;

    const where: Prisma.FeeStructureWhereInput = {
      ...(search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
      ...(!Number.isNaN(classId)
        ? {
            class: {
              id: classId,
            },
          }
        : {}),
    };

    const [feesResult, totalCountResult] = await feePrisma.$transaction([
      feePrisma.feeStructure.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          amount: true,
          active: true,
          class: { select: { id: true, name: true } },
          _count: { select: { studentFees: true } },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      feePrisma.feeStructure.count({ where }),
    ]);

    const fees = feesResult as FeeStructureListItem[];
    const totalCount = totalCountResult as number;

    return NextResponse.json({
      data: fees,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching fees:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<FeeStructureListItem | { error: string }>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = feeStructureSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { id: _ignoredId, amount, classId, description, name } = parsed.data;
    const amountMinor = Math.round(amount * 100);

    const dataForCreate = {
      name,
      description: description ?? null,
      amount: amountMinor,
      ...(typeof classId === "number" ? { classId } : {}),
    };

    const created = await feePrisma.feeStructure.create({
      data: dataForCreate,
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        active: true,
        class: { select: { id: true, name: true } },
        _count: { select: { studentFees: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating fee structure:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
