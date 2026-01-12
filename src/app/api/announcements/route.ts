import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getCurrentSchoolContext } from "@/lib/authz";

export async function GET(req: NextRequest): Promise<NextResponse> {
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

    const where: Prisma.AnnouncementWhereInput = {};

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const role = session.user.role;
    const currentUserId = session.user.id;

    if (role && role !== "admin" && currentUserId) {
      const roleConditions: Record<"teacher" | "student" | "parent", Prisma.ClassWhereInput> = {
        teacher: { lessons: { some: { teacherId: currentUserId } } },
        student: { students: { some: { id: currentUserId } } },
        parent: { students: { some: { parentId: currentUserId } } },
      };

      const roleKey = role as keyof typeof roleConditions;
      const classCondition = roleConditions[roleKey];

      if (classCondition) {
        where.OR = [
          { classId: null },
          { class: classCondition },
        ];
      }
    }

    const { schoolId } = await getCurrentSchoolContext();

    if (schoolId !== null) {
      const schoolOr: Prisma.AnnouncementWhereInput[] = [
        { classId: null },
        { class: { schoolId } },
      ];

      if (where.OR) {
        const existingOr = where.OR;
        delete (where as { OR?: unknown }).OR;
        where.AND = [
          { OR: existingOr },
          { OR: schoolOr },
        ];
      } else {
        where.OR = schoolOr;
      }
    }

    const [announcements, totalCount] = await prisma.$transaction([
      prisma.announcement.findMany({
        where,
        include: {
          class: true,
        },
        take: limit,
        skip: offset,
      }),
      prisma.announcement.count({ where }),
    ]);

    return NextResponse.json({
      data: announcements,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
