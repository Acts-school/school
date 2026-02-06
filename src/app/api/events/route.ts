import { NextRequest, NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest): Promise<NextResponse> {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
    const prisma = (await import('@/lib/prisma')).default;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const search = searchParams.get("search") ?? "";
    const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10);
    const offset = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {};

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const role = session.user.role;
    const currentUserId = session.user.id;

    const roleConditions: Record<string, Prisma.ClassWhereInput> = {
      teacher: { lessons: { some: { teacherId: currentUserId } } },
      student: { students: { some: { id: currentUserId } } },
      parent: { students: { some: { parentId: currentUserId } } },
    };

    where.OR = [
      { classId: null },
      {
        class: roleConditions[role] ?? {},
      },
    ];

    const [events, totalCount] = await prisma.$transaction([
      prisma.event.findMany({
        where,
        include: {
          class: true,
        },
        take: limit,
        skip: offset,
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      data: events,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';