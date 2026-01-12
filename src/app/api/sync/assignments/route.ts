import { NextRequest, NextResponse } from "next/server";
import type { AssessmentKind, CbcCompetency, Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";

type AssignmentSyncOpType = "CREATE_ASSIGNMENT" | "UPDATE_ASSIGNMENT";

type AssignmentSyncStatus = "succeeded" | "failed";

// These string unions mirror the Prisma enums but are defined locally for clarity.
type AssignmentKindCode = "FORMATIVE" | "SUMMATIVE" | "NATIONAL_GATE";

type CbcCompetencyCode =
  | "COMMUNICATION_COLLABORATION"
  | "CRITICAL_THINKING_PROBLEM_SOLVING"
  | "IMAGINATION_CREATIVITY"
  | "CITIZENSHIP"
  | "DIGITAL_LITERACY"
  | "LEARNING_TO_LEARN"
  | "SELF_EFFICACY";

interface BaseAssignmentOperationPayload {
  title: string;
  startDate: string; // ISO string
  dueDate: string; // ISO string
  lessonId: number;
  kind?: AssignmentKindCode;
  competencies?: CbcCompetencyCode[];
  clientRequestId: string;
}

interface CreateAssignmentOperationPayload extends BaseAssignmentOperationPayload {}

interface UpdateAssignmentOperationPayload extends BaseAssignmentOperationPayload {
  id: number;
}

type AssignmentSyncOperation =
  | { type: "CREATE_ASSIGNMENT"; payload: CreateAssignmentOperationPayload }
  | { type: "UPDATE_ASSIGNMENT"; payload: UpdateAssignmentOperationPayload };

interface AssignmentSyncResultItem {
  clientRequestId: string;
  status: AssignmentSyncStatus;
  errorMessage?: string | undefined;
}

interface AssignmentSyncResponse {
  results: AssignmentSyncResultItem[];
}

interface OperationResult {
  ok: boolean;
  errorMessage?: string;
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
): Promise<NextResponse<AssignmentSyncResponse | { error: string }>> {
  try {
    await ensurePermission("assignments.write");
    const { schoolId } = await getCurrentSchoolContext();

    const body = (await req.json()) as {
      operations?: AssignmentSyncOperation[];
    } | null;

    if (!body || !Array.isArray(body.operations) || body.operations.length === 0) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const results: AssignmentSyncResultItem[] = [];

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

      let opResult: OperationResult;

      if (type === "CREATE_ASSIGNMENT") {
        opResult = await handleCreateAssignment(payload, schoolId);
      } else if (type === "UPDATE_ASSIGNMENT") {
        opResult = await handleUpdateAssignment(payload as UpdateAssignmentOperationPayload, schoolId);
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
    console.error("Error in /api/sync/assignments:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleCreateAssignment(
  payload: CreateAssignmentOperationPayload,
  schoolId: number | null,
): Promise<OperationResult> {
  const existing = await prisma.assignment.findUnique({
    where: { clientRequestId: payload.clientRequestId } as unknown as Prisma.AssignmentWhereUniqueInput,
  });

  if (existing) {
    return { ok: true };
  }

  const start = parseDate(payload.startDate);
  const due = parseDate(payload.dueDate);

  if (!start || !due) {
    return { ok: false, errorMessage: "Invalid start or due date" };
  }

  if (due < start) {
    return { ok: false, errorMessage: "Due date cannot be before start date" };
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: payload.lessonId },
    select: {
      class: {
        select: { schoolId: true },
      },
    },
  });

  if (!lesson) {
    return { ok: false, errorMessage: "Lesson not found" };
  }

  const lessonSchoolId = lesson.class?.schoolId ?? null;

  if (schoolId !== null && lessonSchoolId !== null && lessonSchoolId !== schoolId) {
    return { ok: false, errorMessage: "Forbidden for current school" };
  }

  const kind: AssessmentKind = (payload.kind ?? "FORMATIVE") as AssessmentKind;
  const competencies = payload.competencies ?? [];

  try {
    await prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.create({
        data: {
          title: payload.title,
          startDate: start,
          dueDate: due,
          lessonId: payload.lessonId,
          kind,
          clientRequestId: payload.clientRequestId,
          createdFromOffline: true,
        } as unknown as Prisma.AssignmentUncheckedCreateInput,
      });

      if (competencies.length > 0) {
        await tx.assessmentCompetency.createMany({
          data: competencies.map((competency) => ({
            assignmentId: assignment.id,
            competency: competency as CbcCompetency,
          })),
        });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create assignment";
    return { ok: false, errorMessage: message };
  }

  return { ok: true };
}

async function handleUpdateAssignment(
  payload: UpdateAssignmentOperationPayload,
  schoolId: number | null,
): Promise<OperationResult> {
  const start = parseDate(payload.startDate);
  const due = parseDate(payload.dueDate);

  if (!start || !due) {
    return { ok: false, errorMessage: "Invalid start or due date" };
  }

  if (due < start) {
    return { ok: false, errorMessage: "Due date cannot be before start date" };
  }

  const existing = await prisma.assignment.findUnique({
    where: { id: payload.id },
    include: {
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
    return { ok: false, errorMessage: "Assignment not found" };
  }

  const lessonSchoolId = existing.lesson.class?.schoolId ?? null;

  if (schoolId !== null && lessonSchoolId !== null && lessonSchoolId !== schoolId) {
    return { ok: false, errorMessage: "Forbidden for current school" };
  }

  const kind: AssessmentKind = (payload.kind ?? "FORMATIVE") as AssessmentKind;
  const competencies = payload.competencies;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.assignment.update({
        where: { id: payload.id },
        data: {
          title: payload.title,
          startDate: start,
          dueDate: due,
          lessonId: payload.lessonId,
          kind,
        },
      });

      if (competencies !== undefined) {
        await tx.assessmentCompetency.deleteMany({ where: { assignmentId: payload.id } });

        if (competencies.length > 0) {
          await tx.assessmentCompetency.createMany({
            data: competencies.map((competency) => ({
              assignmentId: payload.id,
              competency: competency as CbcCompetency,
            })),
          });
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update assignment";
    return { ok: false, errorMessage: message };
  }

  return { ok: true };
}
