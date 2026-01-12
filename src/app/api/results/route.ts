import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getCurrentSchoolContext } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
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
    const studentIdParam = searchParams.get("studentId");
    const limit = Number.parseInt(
      searchParams.get("limit") ?? ITEM_PER_PAGE.toString(),
      10,
    );
    const offset = (page - 1) * limit;

    const { passingScore } = await getSchoolSettingsDefaults();

    const where: Prisma.ResultWhereInput = {};

    if (studentIdParam) {
      where.studentId = studentIdParam;
    }

    if (search) {
      where.OR = [
        { exam: { title: { contains: search, mode: "insensitive" } } },
        { student: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const role = session.user.role;
    const currentUserId = session.user.id;

    switch (role) {
      case "admin":
        break;
      case "teacher": {
        const teacherOr: Prisma.ResultWhereInput[] = [
          { exam: { lesson: { teacherId: currentUserId } } },
          { assignment: { lesson: { teacherId: currentUserId } } },
        ];

        if (where.OR) {
          const existingOr = where.OR;
          delete (where as { OR?: unknown }).OR;
          const existingAnd: Prisma.ResultWhereInput[] = where.AND
            ? Array.isArray(where.AND)
              ? where.AND
              : [where.AND]
            : [];

          where.AND = [
            ...existingAnd,
            { OR: existingOr },
            { OR: teacherOr },
          ];
        } else {
          where.OR = teacherOr;
        }
        break;
      }
      case "student":
        where.studentId = currentUserId;
        break;
      case "parent":
        where.student = {
          parentId: currentUserId,
        };
        break;
      default:
        break;
    }

    const { schoolId } = await getCurrentSchoolContext();

    if (schoolId !== null) {
      const schoolOr: Prisma.ResultWhereInput[] = [
        { student: { class: { schoolId } } },
        { exam: { lesson: { class: { schoolId } } } },
        { assignment: { lesson: { class: { schoolId } } } },
      ];

      if (where.OR) {
        const existingOr = where.OR;
        delete (where as { OR?: unknown }).OR;
        const existingAnd: Prisma.ResultWhereInput[] = where.AND
          ? Array.isArray(where.AND)
            ? where.AND
            : [where.AND]
          : [];

        where.AND = [
          ...existingAnd,
          { OR: existingOr },
          { OR: schoolOr },
        ];
      } else {
        where.OR = schoolOr;
      }
    }

    const [dataRes, totalCount] = await prisma.$transaction([
      prisma.result.findMany({
        where,
        include: {
          student: { select: { name: true, surname: true } },
          exam: {
            include: {
              lesson: {
                select: {
                  class: { select: { name: true } },
                  teacher: { select: { name: true, surname: true } },
                },
              },
            },
          },
          assignment: {
            include: {
              lesson: {
                select: {
                  class: { select: { name: true } },
                  teacher: { select: { name: true, surname: true } },
                },
              },
            },
          },
        },
        take: limit,
        skip: offset,
      }),
      prisma.result.count({ where }),
    ]);

    type ResultWithIncludes = Prisma.ResultGetPayload<{
      include: {
        student: { select: { name: true; surname: true } };
        exam: {
          include: {
            lesson: {
              select: {
                class: { select: { name: true } };
                teacher: { select: { name: true; surname: true } };
              };
            };
          };
        };
        assignment: {
          include: {
            lesson: {
              select: {
                class: { select: { name: true } };
                teacher: { select: { name: true; surname: true } };
              };
            };
          };
        };
      };
    }>;

    const data = dataRes
      .map((item: ResultWithIncludes) => {
        const assessment = item.exam || item.assignment;

        if (!assessment) return null;

        const isExam = "startTime" in assessment;

        const belowPassing =
          typeof passingScore === "number" && !Number.isNaN(passingScore)
            ? item.score < passingScore
            : false;

        return {
          id: item.id,
          title: assessment.title,
          studentName: item.student.name,
          studentSurname: item.student.surname,
          teacherName: assessment.lesson.teacher.name,
          teacherSurname: assessment.lesson.teacher.surname,
          score: item.score,
          className: assessment.lesson.class.name,
          startTime: (isExam ? assessment.startTime : assessment.startDate).toISOString(),
          isBelowPassing: belowPassing,
        };
      })
      .filter((row): row is {
        id: number;
        title: string;
        studentName: string;
        studentSurname: string;
        teacherName: string;
        teacherSurname: string;
        score: number;
        className: string;
        startTime: string;
        isBelowPassing: boolean;
      } => row !== null);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
