import { NextRequest, NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";

import { ITEM_PER_PAGE } from "@/lib/settings";

export async function GET(req: NextRequest): Promise<NextResponse> {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
    const prisma = (await import('@/lib/prisma')).default;
    const { getCurrentSchoolContext } = await import('@/lib/authz');

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const search = searchParams.get("search") ?? "";
    const limit = Number.parseInt(
      searchParams.get("limit") ?? ITEM_PER_PAGE.toString(),
      10,
    );

    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const safeLimit = Number.isNaN(limit) || limit <= 0 ? ITEM_PER_PAGE : limit;
    const offset = (safePage - 1) * safeLimit;

    const where: Prisma.ParentWhereInput = {};

    if (search) {
      const searchCondition: Prisma.ParentWhereInput = {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            surname: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            username: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      };

      Object.assign(where, searchCondition);
    }

    const { schoolId } = await getCurrentSchoolContext();

    if (schoolId !== null) {
      where.students = {
        some: {
          status: "ACTIVE",
          class: {
            schoolId,
          },
        },
      };
    }

    const [parents, totalCount] = await prisma.$transaction([
      prisma.parent.findMany({
        where,
        include: {
          students: {
            select: {
              name: true,
              surname: true,
            },
          },
        },
        take: safeLimit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.parent.count({ where }),
    ]);

    return NextResponse.json({
      data: parents,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / safeLimit),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching parents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';