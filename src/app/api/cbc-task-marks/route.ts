import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ensurePermission } from "@/lib/authz";

type TaskMarkRecord = {
  studentId: string;
  rubricCriterionId: number;
  comment?: string;
};

type TaskMarkPayload = {
  assignmentId: number;
  sloId: number;
  rubricId: number;
  records: TaskMarkRecord[];
};

const isTaskMarkPayload = (value: unknown): value is TaskMarkPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as {
    assignmentId?: unknown;
    sloId?: unknown;
    rubricId?: unknown;
    records?: unknown;
  };

  if (typeof data.assignmentId !== "number" || !Number.isFinite(data.assignmentId)) {
    return false;
  }

  if (typeof data.sloId !== "number" || !Number.isFinite(data.sloId)) {
    return false;
  }

  if (typeof data.rubricId !== "number" || !Number.isFinite(data.rubricId)) {
    return false;
  }

  if (!Array.isArray(data.records) || data.records.length === 0) {
    return false;
  }

  for (const record of data.records) {
    if (typeof record !== "object" || record === null) {
      return false;
    }

    const r = record as {
      studentId?: unknown;
      rubricCriterionId?: unknown;
      comment?: unknown;
    };

    if (typeof r.studentId !== "string" || r.studentId.length === 0) {
      return false;
    }

    if (
      typeof r.rubricCriterionId !== "number" ||
      !Number.isFinite(r.rubricCriterionId) ||
      r.rubricCriterionId <= 0
    ) {
      return false;
    }

    if (
      r.comment !== undefined &&
      r.comment !== null &&
      typeof r.comment !== "string"
    ) {
      return false;
    }
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

    if (!isTaskMarkPayload(jsonBody)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { assignmentId, sloId, rubricId, records } = jsonBody;

    await ensurePermission("results.write");

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        lesson: {
          select: {
            id: true,
            teacherId: true,
          },
        },
      },
    });

    if (!assignment || !assignment.lesson) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (assignment.lesson.teacherId !== teacherId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const criterionIds = records.map((record) => record.rubricCriterionId);

    const criteria = await prisma.rubricCriterion.findMany({
      where: {
        id: {
          in: criterionIds,
        },
      },
      select: {
        id: true,
        rubricId: true,
      },
    });

    if (criteria.length !== criterionIds.length) {
      return NextResponse.json({ error: "Invalid rubric criterion" }, { status: 400 });
    }

    const criterionRubricMismatch = criteria.some((criterion) => criterion.rubricId !== rubricId);
    if (criterionRubricMismatch) {
      return NextResponse.json({ error: "Rubric and criterion mismatch" }, { status: 400 });
    }

    const observationsToCreate = records.map((record) => ({
      studentId: record.studentId,
      sloId,
      assignmentId,
      lessonId: assignment.lesson?.id,
      teacherId,
      rubricId,
      rubricCriterionId: record.rubricCriterionId,
      notes:
        record.comment === undefined || record.comment === null || record.comment.trim() === ""
          ? null
          : record.comment.trim(),
    }));

    await prisma.learningObservation.createMany({
      data: observationsToCreate,
    });

    return NextResponse.json(
      {
        success: true,
        createdCount: observationsToCreate.length,
      },
      { status: 200 },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error saving CBC task rubric marks", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
