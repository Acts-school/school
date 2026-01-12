import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
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
    const classIdParam = searchParams.get("classId");
    const teacherIdParam = searchParams.get("teacherId");
    const limit = Number.parseInt(
      searchParams.get("limit") ?? ITEM_PER_PAGE.toString(),
      10,
    );
    const offset = (page - 1) * limit;

    const where: Prisma.AssignmentWhereInput = {};
    const lessonFilter: Prisma.LessonWhereInput = {};

    if (classIdParam) {
      const parsed = Number.parseInt(classIdParam, 10);
      if (!Number.isNaN(parsed)) {
        lessonFilter.classId = parsed;
      }
    }

    if (teacherIdParam) {
      lessonFilter.teacherId = teacherIdParam;
    }

    if (search) {
      lessonFilter.subject = {
        name: { contains: search, mode: "insensitive" },
      };
    }

    const role = session.user.role;
    const currentUserId = session.user.id;

    switch (role) {
      case "admin":
        break;
      case "teacher":
        lessonFilter.teacherId = currentUserId;
        break;
      case "student":
        lessonFilter.class = {
          students: {
            some: {
              id: currentUserId,
            },
          },
        };
        break;
      case "parent":
        lessonFilter.class = {
          students: {
            some: {
              parentId: currentUserId,
            },
          },
        };
        break;
      default:
        break;
    }

    if (Object.keys(lessonFilter).length > 0) {
      where.lesson = {
        ...(where.lesson as Prisma.LessonRelationFilter | undefined),
        is: {
          ...(typeof (where.lesson as Prisma.LessonRelationFilter | undefined)?.is ===
          "object"
            ? (where.lesson as Prisma.LessonRelationFilter).is
            : {}),
          ...lessonFilter,
        },
      };
    }

    const [assignments, totalCount] = await prisma.$transaction([
      prisma.assignment.findMany({
        where,
        include: {
          lesson: {
            select: {
              subject: { select: { name: true } },
              teacher: { select: { name: true, surname: true } },
              class: { select: { name: true } },
            },
          },
        },
        take: limit,
        skip: offset,
      }),
      prisma.assignment.count({ where }),
    ]);

    return NextResponse.json({
      data: assignments,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
