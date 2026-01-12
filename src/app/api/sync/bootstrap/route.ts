import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getCurrentSchoolContext } from "@/lib/authz";

interface BootstrapClass {
  id: number;
  name: string;
  gradeId: number;
  schoolId: number | null;
}

interface BootstrapStudent {
  id: string;
  name: string;
  surname: string;
  classId: number;
  gradeId: number;
}

interface BootstrapLesson {
  id: number;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  subjectId: number;
  classId: number;
  teacherId: string;
}

interface BootstrapSubject {
  id: number;
  name: string;
}

interface BootstrapTeacher {
  id: string;
  name: string;
  surname: string;
}

interface BootstrapPayload {
  serverTime: string;
  data: {
    classes: BootstrapClass[];
    students: BootstrapStudent[];
    lessons: BootstrapLesson[];
    subjects: BootstrapSubject[];
    teachers: BootstrapTeacher[];
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const payload: BootstrapPayload = {
      serverTime: new Date().toISOString(),
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
    console.error("Error in /api/sync/bootstrap:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
