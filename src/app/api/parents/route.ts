import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { getCurrentSchoolContext } from "@/lib/authz";
import { ITEM_PER_PAGE } from "@/lib/settings";

export async function GET(req: NextRequest): Promise<NextResponse> {
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
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    const { schoolId } = await getCurrentSchoolContext();

    if (schoolId !== null) {
      where.students = {
        some: {
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
