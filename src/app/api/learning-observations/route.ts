import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ensurePermission } from "@/lib/authz";

type CreateLearningObservationPayload = {
  lessonId: number;
  studentIds: string[];
  notes?: string;
};

const isCreateLearningObservationPayload = (
  value: unknown,
): value is CreateLearningObservationPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as {
    lessonId?: unknown;
    studentIds?: unknown;
    notes?: unknown;
  };

  if (typeof data.lessonId !== "number" || !Number.isFinite(data.lessonId)) {
    return false;
  }

  if (!Array.isArray(data.studentIds) || data.studentIds.length === 0) {
    return false;
  }

  if (!data.studentIds.every((id) => typeof id === "string" && id.length > 0)) {
    return false;
  }

  if (
    data.notes !== undefined &&
    data.notes !== null &&
    typeof data.notes !== "string"
  ) {
    return false;
  }

  return true;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = session.user.id;

    const jsonBody: unknown = await request.json();

    if (!isCreateLearningObservationPayload(jsonBody)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { lessonId, studentIds, notes } = jsonBody;

    if (studentIds.length === 0) {
      return NextResponse.json({ error: "At least one student is required" }, {
        status: 400,
      });
    }

    await ensurePermission("results.write");

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        subject: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (lesson.teacherId !== teacherId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subjectName = lesson.subject.name;

    const normalizeName = (value: string): string => value.trim().toLowerCase();

    const sloMatchesLessonSubject = (params: {
      subjectName: string;
      learningAreaName: string;
    }): boolean => {
      const subject = normalizeName(params.subjectName);
      const learningArea = normalizeName(params.learningAreaName);

      if (subject === "" || learningArea === "") {
        return false;
      }

      const keywordPairs: Array<{ subjectKeyword: string; learningAreaKeyword: string }> = [
        { subjectKeyword: "english", learningAreaKeyword: "english" },
        { subjectKeyword: "math", learningAreaKeyword: "math" },
        { subjectKeyword: "language", learningAreaKeyword: "language" },
      ];

      return keywordPairs.some((pair) => {
        return (
          subject.includes(pair.subjectKeyword) &&
          learningArea.includes(pair.learningAreaKeyword)
        );
      });
    };

    const allSlos = await prisma.specificLearningOutcome.findMany({
      include: {
        subStrand: {
          include: {
            strand: {
              include: {
                learningArea: true,
              },
            },
          },
        },
      },
    });

    const matchingSlos = allSlos.filter((slo) =>
      sloMatchesLessonSubject({
        subjectName,
        learningAreaName: slo.subStrand.strand.learningArea.name,
      }),
    );

    const effectiveSlos = matchingSlos.length > 0 ? matchingSlos : [];

    const trimmedNotes =
      notes === undefined || notes === null || notes.trim() === "" ? null : notes.trim();

    const dataToCreate: Array<{
      studentId: string;
      lessonId: number;
      teacherId: string;
      sloId?: number;
      notes: string | null;
    }> = [];

    if (effectiveSlos.length === 0) {
      for (const studentId of studentIds) {
        dataToCreate.push({
          studentId,
          lessonId,
          teacherId,
          notes: trimmedNotes,
        });
      }
    } else {
      for (const studentId of studentIds) {
        for (const slo of effectiveSlos) {
          dataToCreate.push({
            studentId,
            lessonId,
            teacherId,
            sloId: slo.id,
            notes: trimmedNotes,
          });
        }
      }
    }

    if (dataToCreate.length === 0) {
      return NextResponse.json({ error: "No observations to create" }, { status: 400 });
    }

    await prisma.learningObservation.createMany({
      data: dataToCreate,
    });

    return NextResponse.json(
      {
        success: true,
        createdCount: dataToCreate.length,
      },
      { status: 200 },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating learning observations", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
