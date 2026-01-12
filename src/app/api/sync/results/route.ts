import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";

type ResultSyncOpType = "CREATE_RESULT" | "UPDATE_RESULT";

type ResultSyncStatus = "succeeded" | "failed";

interface BaseResultOperationPayload {
  score: number;
  studentId: string;
  examId?: number;
  assignmentId?: number;
  clientRequestId: string;
}

interface CreateResultOperationPayload extends BaseResultOperationPayload {}

interface UpdateResultOperationPayload extends BaseResultOperationPayload {
  id: number;
}

type ResultSyncOperation =
  | { type: "CREATE_RESULT"; payload: CreateResultOperationPayload }
  | { type: "UPDATE_RESULT"; payload: UpdateResultOperationPayload };

interface ResultSyncResultItem {
  clientRequestId: string;
  status: ResultSyncStatus;
  errorMessage?: string | undefined;
}

interface ResultSyncResponse {
  results: ResultSyncResultItem[];
}

interface OperationResult {
  ok: boolean;
  errorMessage?: string;
}

function validateContext(payload: BaseResultOperationPayload): string | null {
  const hasExam = typeof payload.examId === "number" && payload.examId > 0;
  const hasAssignment = typeof payload.assignmentId === "number" && payload.assignmentId > 0;

  const count = Number(hasExam) + Number(hasAssignment);
  if (count === 0) {
    return "Missing exam or assignment context";
  }
  if (count > 1) {
    return "Specify either an exam or an assignment, but not both";
  }
  return null;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ResultSyncResponse | { error: string }>> {
  try {
    await ensurePermission("results.write");
    const { schoolId } = await getCurrentSchoolContext();

    const body = (await req.json()) as {
      operations?: ResultSyncOperation[];
    } | null;

    if (!body || !Array.isArray(body.operations) || body.operations.length === 0) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const results: ResultSyncResultItem[] = [];

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

      const ctxError = validateContext(payload);
      if (ctxError) {
        results.push({
          clientRequestId: payload.clientRequestId,
          status: "failed",
          errorMessage: ctxError,
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      let opResult: OperationResult;

      if (type === "CREATE_RESULT") {
        opResult = await handleCreateResult(payload, schoolId);
      } else if (type === "UPDATE_RESULT") {
        opResult = await handleUpdateResult(payload as UpdateResultOperationPayload, schoolId);
      } else {
        opResult = { ok: false, errorMessage: "Unsupported operation type" };
      }

      results.push({
        clientRequestId: payload.clientRequestId,
        status: opResult.ok ? "succeeded" : "failed",
        errorMessage: opResult.errorMessage,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    // eslint-disable-next-line no-console
    console.error("Error in /api/sync/results:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleCreateResult(
  payload: CreateResultOperationPayload,
  schoolId: number | null,
): Promise<OperationResult> {
  const existing = await prisma.result.findUnique({
    where: { clientRequestId: payload.clientRequestId } as unknown as Prisma.ResultWhereUniqueInput,
  });

  if (existing) {
    return { ok: true };
  }

  const student = await prisma.student.findUnique({
    where: { id: payload.studentId },
    select: {
      class: {
        select: { schoolId: true },
      },
    },
  });

  if (!student) {
    return { ok: false, errorMessage: "Student not found" };
  }

  const studentSchoolId = student.class?.schoolId ?? null;

  if (schoolId !== null && studentSchoolId !== null && studentSchoolId !== schoolId) {
    return { ok: false, errorMessage: "Forbidden for current school" };
  }

  const hasExam = typeof payload.examId === "number" && payload.examId > 0;
  const hasAssignment = typeof payload.assignmentId === "number" && payload.assignmentId > 0;

  if (hasExam) {
    const exam = await prisma.exam.findUnique({
      where: { id: payload.examId as number },
      select: {
        lesson: {
          select: {
            class: {
              select: { schoolId: true },
            },
          },
        },
      },
    });

    if (!exam) {
      return { ok: false, errorMessage: "Exam not found" };
    }

    const examSchoolId = exam.lesson.class?.schoolId ?? null;

    if (schoolId !== null && examSchoolId !== null && examSchoolId !== schoolId) {
      return { ok: false, errorMessage: "Forbidden for current school" };
    }
  }

  if (hasAssignment) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: payload.assignmentId as number },
      select: {
        lesson: {
          select: {
            class: {
              select: { schoolId: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      return { ok: false, errorMessage: "Assignment not found" };
    }

    const assignmentSchoolId = assignment.lesson.class?.schoolId ?? null;

    if (schoolId !== null && assignmentSchoolId !== null && assignmentSchoolId !== schoolId) {
      return { ok: false, errorMessage: "Forbidden for current school" };
    }
  }

  await prisma.result.create({
    data: {
      score: payload.score,
      examId: hasExam ? (payload.examId as number) : null,
      assignmentId: hasAssignment ? (payload.assignmentId as number) : null,
      studentId: payload.studentId,
      clientRequestId: payload.clientRequestId,
      createdFromOffline: true,
    } as unknown as Prisma.ResultUncheckedCreateInput,
  });

  return { ok: true };
}

async function handleUpdateResult(
  payload: UpdateResultOperationPayload,
  schoolId: number | null,
): Promise<OperationResult> {
  const existing = await prisma.result.findUnique({
    where: { id: payload.id },
    include: {
      student: {
        select: {
          class: {
            select: { schoolId: true },
          },
        },
      },
      exam: {
        select: {
          lesson: {
            select: {
              class: {
                select: { schoolId: true },
              },
            },
          },
        },
      },
      assignment: {
        select: {
          lesson: {
            select: {
              class: {
                select: { schoolId: true },
              },
            },
          },
        },
      },
    },
  });

  if (!existing) {
    return { ok: false, errorMessage: "Result not found" };
  }

  const studentSchoolId = existing.student.class?.schoolId ?? null;
  const examSchoolId = existing.exam?.lesson.class?.schoolId ?? null;
  const assignmentSchoolId = existing.assignment?.lesson.class?.schoolId ?? null;

  if (schoolId !== null) {
    const schoolIds: number[] = [];
    if (studentSchoolId !== null) schoolIds.push(studentSchoolId);
    if (examSchoolId !== null) schoolIds.push(examSchoolId);
    if (assignmentSchoolId !== null) schoolIds.push(assignmentSchoolId);

    const hasMismatch = schoolIds.some((value) => value !== schoolId);

    if (hasMismatch) {
      return { ok: false, errorMessage: "Forbidden for current school" };
    }
  }

  const hasExam = typeof payload.examId === "number" && payload.examId > 0;
  const hasAssignment = typeof payload.assignmentId === "number" && payload.assignmentId > 0;

  const ctxError = validateContext(payload);
  if (ctxError) {
    return { ok: false, errorMessage: ctxError };
  }

  await prisma.result.update({
    where: { id: payload.id },
    data: {
      score: payload.score,
      examId: hasExam ? (payload.examId as number) : null,
      assignmentId: hasAssignment ? (payload.assignmentId as number) : null,
      studentId: payload.studentId,
    },
  });

  return { ok: true };
}
