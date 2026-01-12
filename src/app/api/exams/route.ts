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

    const where: Prisma.ExamWhereInput = {};
    const lessonFilter: Prisma.LessonWhereInput = {};

    if (classIdParam) {
      lessonFilter.classId = Number.parseInt(classIdParam, 10);
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
      case "teacher": {
        lessonFilter.teacherId = currentUserId;
        break;
      }
      case "student": {
        lessonFilter.class = {
          students: {
            some: {
              id: currentUserId,
            },
          },
        };
        break;
      }
      case "parent": {
        lessonFilter.class = {
          students: {
            some: {
              parentId: currentUserId,
            },
          },
        };
        break;
      }
      default:
        break;
    }

    if (Object.keys(lessonFilter).length > 0) {
      where.lesson = lessonFilter;
    }

    const [exams, totalCount] = await prisma.$transaction([
      prisma.exam.findMany({
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
        orderBy: { startTime: "desc" },
      }),
      prisma.exam.count({ where }),
    ]);

    return NextResponse.json({
      data: exams,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching exams:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
