import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getCurrentSchoolContext } from "@/lib/authz";

interface LessonListItem {
  id: number;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: { name: string };
  class: { name: string };
  teacher: { name: string; surname: string };
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const pageParam = searchParams.get("page");
    const search = searchParams.get("search") ?? undefined;
    const classIdParam = searchParams.get("classId");
    const teacherIdParam = searchParams.get("teacherId");
    const limitParam = searchParams.get("limit");

    const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
    const limit = limitParam
      ? Number.parseInt(limitParam, 10)
      : ITEM_PER_PAGE;

    const where: Prisma.LessonWhereInput = {};

    if (classIdParam) {
      const parsedClassId = Number.parseInt(classIdParam, 10);
      if (!Number.isNaN(parsedClassId)) {
        where.classId = parsedClassId;
      }
    }

    if (teacherIdParam) {
      where.teacherId = teacherIdParam;
    }

    if (search) {
      where.OR = [
        { subject: { name: { contains: search, mode: "insensitive" } } },
        { teacher: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const { schoolId } = await getCurrentSchoolContext();

    if (schoolId !== null) {
      // Keep this pattern consistent with the original lessons page to satisfy Prisma types.
      where.class = {
        ...(where.class ?? {}),
        ...( {} as Record<string, unknown>),
      };
      (where.class as Record<string, unknown>).schoolId = schoolId;
    }

    const offset = (page - 1) * limit;

    type LessonWithIncludes = Prisma.LessonGetPayload<{
      include: {
        subject: { select: { name: true } };
        class: { select: { name: true } };
        teacher: { select: { name: true; surname: true } };
      };
    }>;

    const [lessons, total] = await prisma.$transaction([
      prisma.lesson.findMany({
        where,
        include: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
          teacher: { select: { name: true, surname: true } },
        },
        take: limit,
        skip: offset,
      }),
      prisma.lesson.count({ where }),
    ]);

    const data: LessonListItem[] = (lessons as LessonWithIncludes[]).map(
      (lesson) => ({
        id: lesson.id,
        name: lesson.subject.name,
        day: lesson.day,
        startTime: lesson.startTime.toISOString(),
        endTime: lesson.endTime.toISOString(),
        subject: { name: lesson.subject.name },
        class: { name: lesson.class.name },
        teacher: {
          name: lesson.teacher.name,
          surname: lesson.teacher.surname,
        },
      }),
    );

    const responseBody: ApiResponse<LessonListItem> = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
