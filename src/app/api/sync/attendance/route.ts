import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";

type AttendanceOpType = "CREATE_ATTENDANCE" | "UPDATE_ATTENDANCE";

type AttendanceSyncResultStatus = "succeeded" | "failed";

interface BaseAttendanceOperationPayload {
  date: string;
  present: boolean;
  studentId: string;
  lessonId: number;
  clientRequestId: string;
}

interface CreateAttendanceOperationPayload extends BaseAttendanceOperationPayload {}

interface UpdateAttendanceOperationPayload extends BaseAttendanceOperationPayload {
  id: number;
}

type AttendanceSyncOperation =
  | {
      type: "CREATE_ATTENDANCE";
      payload: CreateAttendanceOperationPayload;
    }
  | {
      type: "UPDATE_ATTENDANCE";
      payload: UpdateAttendanceOperationPayload;
    };

interface AttendanceSyncResultItem {
  clientRequestId: string;
  status: AttendanceSyncResultStatus;
  errorMessage?: string | undefined;
}

interface AttendanceSyncResponse {
  results: AttendanceSyncResultItem[];
}

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<AttendanceSyncResponse | { error: string }>> {
  try {
    await ensurePermission("attendance.write");
    const { schoolId } = await getCurrentSchoolContext();

    const body = (await req.json()) as {
      operations?: AttendanceSyncOperation[];
    } | null;

    if (!body || !Array.isArray(body.operations) || body.operations.length === 0) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const results: AttendanceSyncResultItem[] = [];

    for (const op of body.operations) {
      const { type, payload } = op;

      if (!payload.clientRequestId || payload.clientRequestId.trim().length === 0) {
        results.push({
          clientRequestId: "",
          status: "failed",
          errorMessage: "Missing clientRequestId",
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      const clientRequestId = payload.clientRequestId;

      if (type === "CREATE_ATTENDANCE") {
        const created = await handleCreateAttendance(payload, schoolId);
        results.push({
          clientRequestId,
          status: created.ok ? "succeeded" : "failed",
          errorMessage: created.errorMessage,
        });
      } else if (type === "UPDATE_ATTENDANCE") {
        const updated = await handleUpdateAttendance(payload, schoolId);
        results.push({
          clientRequestId,
          status: updated.ok ? "succeeded" : "failed",
          errorMessage: updated.errorMessage,
        });
      } else {
        results.push({
          clientRequestId,
          status: "failed",
          errorMessage: "Unsupported operation type",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    // eslint-disable-next-line no-console
    console.error("Error in /api/sync/attendance:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface OperationResult {
  ok: boolean;
  errorMessage?: string;
}

async function handleCreateAttendance(
  payload: CreateAttendanceOperationPayload,
  schoolId: number | null,
): Promise<OperationResult> {
  const { clientRequestId, date, present, studentId, lessonId } = payload;

  const existing = await prisma.attendance.findUnique({
    where: { clientRequestId } as unknown as Prisma.AttendanceWhereUniqueInput,
  });

  if (existing) {
    return { ok: true };
  }

  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return { ok: false, errorMessage: "Invalid date" };
  }

  const [student, lesson] = await prisma.$transaction([
    prisma.student.findUnique({
      where: { id: studentId },
      select: {
        class: {
          select: { schoolId: true },
        },
      },
    }),
    prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        class: {
          select: { schoolId: true },
        },
      },
    }),
  ]);

  if (!student || !lesson) {
    return { ok: false, errorMessage: "Student or lesson not found" };
  }

  if (schoolId !== null) {
    const studentSchoolId = student.class?.schoolId ?? null;
    const lessonSchoolId = lesson.class.schoolId ?? null;

    const schoolIds: number[] = [];
    if (studentSchoolId !== null) schoolIds.push(studentSchoolId);
    if (lessonSchoolId !== null) schoolIds.push(lessonSchoolId);

    const hasMismatch = schoolIds.some((value) => value !== schoolId);

    if (hasMismatch) {
      return { ok: false, errorMessage: "Forbidden for current school" };
    }
  }

  await prisma.attendance.create({
    data: {
      date: parsedDate,
      present,
      studentId,
      lessonId,
      clientRequestId,
      createdFromOffline: true,
    } as unknown as Prisma.AttendanceUncheckedCreateInput,
  });

  return { ok: true };
}

async function handleUpdateAttendance(
  payload: UpdateAttendanceOperationPayload,
  schoolId: number | null,
): Promise<OperationResult> {
  const { id, date, present, studentId, lessonId } = payload;

  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return { ok: false, errorMessage: "Invalid date" };
  }

  const existing = await prisma.attendance.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          class: {
            select: { schoolId: true },
          },
        },
      },
      lesson: {
        select: {
          class: {
            select: { schoolId: true },
          },
        },
      },
    },
  });

  if (!existing) {
    return { ok: false, errorMessage: "Attendance not found" };
  }

  if (schoolId !== null) {
    const studentSchoolId = existing.student.class?.schoolId ?? null;
    const lessonSchoolId = existing.lesson.class.schoolId ?? null;

    const schoolIds: number[] = [];
    if (studentSchoolId !== null) schoolIds.push(studentSchoolId);
    if (lessonSchoolId !== null) schoolIds.push(lessonSchoolId);

    const hasMismatch = schoolIds.some((value) => value !== schoolId);

    if (hasMismatch) {
      return { ok: false, errorMessage: "Forbidden for current school" };
    }
  }

  await prisma.attendance.update({
    where: { id },
    data: {
      date: parsedDate,
      present,
      studentId,
      lessonId,
    },
  });

  return { ok: true };
}
