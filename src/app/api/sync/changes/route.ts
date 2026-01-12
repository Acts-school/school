import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getCurrentSchoolContext } from "@/lib/authz";

interface SyncClass {
  id: number;
  name: string;
  gradeId: number;
  schoolId: number | null;
}

interface SyncStudent {
  id: string;
  name: string;
  surname: string;
  classId: number;
  gradeId: number;
}

interface SyncLesson {
  id: number;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  subjectId: number;
  classId: number;
  teacherId: string;
}

interface SyncSubject {
  id: number;
  name: string;
}

interface SyncTeacher {
  id: string;
  name: string;
  surname: string;
}

interface SyncChangesPayload {
  serverTime: string;
  since: string | null;
  data: {
    classes: SyncClass[];
    students: SyncStudent[];
    lessons: SyncLesson[];
    subjects: SyncSubject[];
    teachers: SyncTeacher[];
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const sinceParam = url.searchParams.get("since");
    let since: Date | null = null;

    if (sinceParam) {
      const parsed = new Date(sinceParam);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid 'since' parameter. Expected ISO date string." },
          { status: 400 },
        );
      }
      since = parsed;
    }

    const role = session.user.role;
    const currentUserId = session.user.id;

    const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

    const classWhere: Prisma.ClassWhereInput = {};
    const studentWhere: Prisma.StudentWhereInput = {};
    const lessonWhere: Prisma.LessonWhereInput = {};
    const subjectWhere: Prisma.SubjectWhereInput = {};
    const teacherWhere: Prisma.TeacherWhereInput = {};
    const studentClassWhere: Prisma.ClassWhereInput = {};

    if (schoolId !== null) {
      (classWhere as Record<string, unknown>).schoolId = schoolId;
      (studentClassWhere as Record<string, unknown>).schoolId = schoolId;
    }

    switch (role) {
      case "teacher": {
        classWhere.OR = [
          {
            lessons: {
              some: {
                teacherId: currentUserId,
              },
            },
          },
          {
            supervisorId: currentUserId,
          },
        ];

        studentClassWhere.lessons = {
          some: {
            teacherId: currentUserId,
          },
        };

        lessonWhere.teacherId = currentUserId;

        subjectWhere.lessons = {
          some: {
            teacherId: currentUserId,
          },
        };
        break;
      }
      case "admin":
      default:
        break;
    }

    if (schoolId !== null) {
      lessonWhere.class = {
        ...(lessonWhere.class ?? {}),
        ...( {} as Record<string, unknown>),
      };
      (lessonWhere.class as Record<string, unknown>).schoolId = schoolId;
    }

    type ClassRow = Pick<Prisma.ClassGetPayload<{ select: { id: true; name: true; gradeId: true; schoolId: true } }>, "id" | "name" | "gradeId" | "schoolId">;
    type StudentRow = Prisma.StudentGetPayload<{
      select: {
        id: true;
        name: true;
        surname: true;
        classId: true;
        gradeId: true;
      };
    }>;
    type LessonRow = Prisma.LessonGetPayload<{
      select: {
        id: true;
        name: true;
        day: true;
        startTime: true;
        endTime: true;
        subjectId: true;
        classId: true;
        teacherId: true;
      };
    }>;
    type SubjectRow = Prisma.SubjectGetPayload<{ select: { id: true; name: true } }>;
    type TeacherRow = Prisma.TeacherGetPayload<{ select: { id: true; name: true; surname: true } }>;

    if (Object.keys(studentClassWhere).length > 0) {
      studentWhere.class = studentClassWhere;
    }

    let teacherIdsForSchool: string[] | null = null;

    if (schoolId !== null && !isSuperAdmin) {
      type TeacherMembershipRow = { userId: string };

      const memberships: TeacherMembershipRow[] = await prisma.schoolUser.findMany({
        where: {
          schoolId,
          role: "TEACHER",
        },
        select: { userId: true },
      });

      teacherIdsForSchool = memberships.map((m) => m.userId);

      if (teacherIdsForSchool.length === 0) {
        teacherIdsForSchool = [];
      }
    }

    if (teacherIdsForSchool !== null) {
      teacherWhere.id = { in: teacherIdsForSchool };
    }

    // NOTE: For now, core entities (Class, Student, Lesson, Subject, Teacher) do not
    // have an updatedAt field in the Prisma schema, so we cannot filter by
    // updatedAt > since yet. This endpoint returns a scoped snapshot that clients
    // can use to refresh local caches. Once updatedAt is available on these models,
    // the same role/school filters can be extended with since-based conditions.
    void since;

    const [classes, students, lessons, subjects, teachers] = await prisma.$transaction([
      prisma.class.findMany({
        where: classWhere,
        select: { id: true, name: true, gradeId: true, schoolId: true },
        orderBy: { name: "asc" },
      }),
      prisma.student.findMany({
        where: studentWhere,
        select: { id: true, name: true, surname: true, classId: true, gradeId: true },
      }),
      prisma.lesson.findMany({
        where: lessonWhere,
        select: {
          id: true,
          name: true,
          day: true,
          startTime: true,
          endTime: true,
          subjectId: true,
          classId: true,
          teacherId: true,
        },
      }),
      prisma.subject.findMany({
        where: subjectWhere,
        select: { id: true, name: true },
      }),
      prisma.teacher.findMany({
        where: teacherWhere,
        select: { id: true, name: true, surname: true },
      }),
    ]);

    const payload: SyncChangesPayload = {
      serverTime: new Date().toISOString(),
      since: since ? since.toISOString() : null,
      data: {
        classes: classes.map((c: ClassRow) => ({
          id: c.id,
          name: c.name,
          gradeId: c.gradeId,
          schoolId: c.schoolId,
        })),
        students: students.map((s: StudentRow) => ({
          id: s.id,
          name: s.name,
          surname: s.surname,
          classId: s.classId,
          gradeId: s.gradeId,
        })),
        lessons: lessons.map((l: LessonRow) => ({
          id: l.id,
          name: l.name,
          day: l.day,
          startTime: l.startTime.toISOString(),
          endTime: l.endTime.toISOString(),
          subjectId: l.subjectId,
          classId: l.classId,
          teacherId: l.teacherId,
        })),
        subjects: subjects.map((sub: SubjectRow) => ({
          id: sub.id,
          name: sub.name,
        })),
        teachers: teachers.map((t: TeacherRow) => ({
          id: t.id,
          name: t.name,
          surname: t.surname,
        })),
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in /api/sync/changes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
