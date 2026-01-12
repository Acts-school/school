import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
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
    const search = searchParams.get("search") ?? undefined;
    const classIdParam = searchParams.get("classId");
    const limit = Number.parseInt(
      searchParams.get("limit") ?? ITEM_PER_PAGE.toString(),
      10,
    );
    const offset = (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = {};
    const lessonFilter: Prisma.LessonWhereInput = {};
    const studentFilter: Prisma.StudentWhereInput = {};

    if (classIdParam) {
      const parsed = Number.parseInt(classIdParam, 10);
      if (!Number.isNaN(parsed)) {
        lessonFilter.classId = parsed;
      }
    }

    if (search) {
      studentFilter.name = { contains: search, mode: "insensitive" };
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
        where.studentId = currentUserId;
        break;
      case "parent":
        studentFilter.parentId = currentUserId;
        break;
      default:
        break;
    }

    if (Object.keys(lessonFilter).length > 0) {
      const existingLessonRelation =
        (where.lesson as Prisma.LessonRelationFilter | undefined) ?? undefined;

      where.lesson = {
        ...(existingLessonRelation ?? {}),
        is: {
          ...(existingLessonRelation?.is ?? {}),
          ...lessonFilter,
        },
      };
    }

    if (Object.keys(studentFilter).length > 0) {
      where.student = studentFilter;
    }

    const { schoolId } = await getCurrentSchoolContext();

    if (schoolId !== null) {
      const existingAnd =
        where.AND == null
          ? []
          : Array.isArray(where.AND)
            ? where.AND
            : [where.AND];

      where.AND = [
        ...existingAnd,
        {
          OR: [
            {
              lesson: {
                class: { schoolId },
              } as unknown as Prisma.LessonRelationFilter,
            },
            {
              student: {
                class: { schoolId },
              } as unknown as Prisma.StudentRelationFilter,
            },
          ],
        },
      ];
    }

    const [data, count] = await prisma.$transaction([
      prisma.attendance.findMany({
        where,
        include: {
          student: {
            select: {
              name: true,
              surname: true,
              class: { select: { name: true } },
            },
          },
          lesson: {
            select: {
              name: true,
              subject: { select: { name: true } },
              class: { select: { name: true } },
            },
          },
        },
        take: limit,
        skip: offset,
      }),
      prisma.attendance.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching attendance list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
