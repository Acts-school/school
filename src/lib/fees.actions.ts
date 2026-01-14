"use server";

import { revalidatePath } from "next/cache";
import prisma from "./prisma";
import { ensurePermission, getCurrentSchoolContext, getAuthContext } from "@/lib/authz";
import { sendSms } from "@/lib/sms";
// Local enum aliases to avoid depending on generated Prisma client types
export type InvoiceStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "POS" | "ONLINE" | "MPESA";
export type Term = "TERM1" | "TERM2" | "TERM3";

// Narrowed prisma facade for finance models (until prisma generate runs)
type FeeStructureCreateArgs = { data: { name: string; amount: number; gradeId?: number; active?: boolean } };
type InvoiceCreateArgs = { data: { studentId: string; term: Term; dueDate: Date; totalAmount: number; status: InvoiceStatus } };
type InvoiceFindUniqueArgs = { where: { id: number }; select: { id: boolean; totalAmount: boolean; payments: { select: { amount: boolean } } } };
type PaymentCreateArgs = { data: { invoiceId: number; amount: number; method: PaymentMethod; reference?: string; paidAt?: Date } };
type InvoiceUpdateArgs = { where: { id: number }; data: { status: InvoiceStatus } };
type ExpenseCreateArgs = {
  data: {
    title: string;
    amount: number;
    category: string;
    date?: Date;
    notes?: string;
    schoolId?: number | null;
  };
};

type StudentFeeStatus = "unpaid" | "partially_paid" | "paid";

type StudentFeePick = {
  id: string;
  baseAmount: number | null;
  amountDue: number;
  amountPaid: number;
  locked: boolean;
  status: StudentFeeStatus;
};

type StudentFeeSelect = {
  id: boolean;
  baseAmount: boolean;
  amountDue: boolean;
  amountPaid: boolean;
  locked: boolean;
  status: boolean;
};

type PrismaFinanceClient = {
  feeStructure: { create: (args: FeeStructureCreateArgs) => Promise<unknown> };
  invoice: {
    create: (args: InvoiceCreateArgs) => Promise<unknown>;
    findUnique: (args: InvoiceFindUniqueArgs) => Promise<{ id: number; totalAmount: number; payments: Array<{ amount: number }> } | null>;
    update: (args: InvoiceUpdateArgs) => Promise<unknown>;
  };
  payment: { create: (args: PaymentCreateArgs) => Promise<unknown> };
  expense: { create: (args: ExpenseCreateArgs) => Promise<unknown> };
  studentFee: {
    findUnique: (args: { where: { id: string }; select: StudentFeeSelect }) => Promise<StudentFeePick | null>;
    update: (args: { where: { id: string }; data: { baseAmount?: number | null; amountDue?: number; amountPaid?: number; locked?: boolean; status?: StudentFeeStatus; discountReason?: string | null } }) => Promise<StudentFeePick>;
  };
  $transaction: <T>(ops: ReadonlyArray<Promise<T>>) => Promise<Array<T>>;
};

const financePrisma = prisma as unknown as PrismaFinanceClient;

type ReminderStudent = {
  id: string;
  name: string;
  surname: string;
  parent: { id: string; phone: string; name: string; surname: string } | null;
};

type ReminderStudentFeePick = {
  id: string;
  amountDue: number;
  amountPaid: number;
  dueDate: Date | null;
  status: StudentFeeStatus;
  term: Term | null;
  academicYear: number | null;
  structure: { name: string } | null;
  student: ReminderStudent;
};

type ReminderStudentFeeFindUniqueArgs = {
  where: { id: string };
  select: {
    id: true;
    amountDue: true;
    amountPaid: true;
    dueDate: true;
    status: true;
    term: true;
    academicYear: true;
    structure: { select: { name: true } } | null;
    student: {
      select: {
        id: true;
        name: true;
        surname: true;
        parent: { select: { id: true; phone: true; name: true; surname: true } };
      };
    };
  };
};

type ReminderStudentFeeListRow = {
  amountDue: number;
  amountPaid: number;
};

type ReminderStudentFeeFindManyArgs = {
  where: {
    studentId: string;
    term?: Term;
    academicYear?: number;
  };
  select: {
    amountDue: true;
    amountPaid: true;
  };
};

type ReminderPrismaClient = {
  studentFee: {
    findUnique: (args: ReminderStudentFeeFindUniqueArgs) => Promise<ReminderStudentFeePick | null>;
    findMany: (args: ReminderStudentFeeFindManyArgs) => Promise<ReminderStudentFeeListRow[]>;
  };
};

const reminderPrisma = prisma as unknown as ReminderPrismaClient;

type SmsDeliveryStatus = "PENDING" | "SENT" | "FAILED";

type SmsNotificationLiteRow = {
  status: SmsDeliveryStatus;
  errorMessage: string | null;
};

type SmsNotificationFindFirstArgs = {
  where: {
    kind: "ANNOUNCEMENT" | "EVENT" | "FEE_REMINDER";
    relatedId: string;
    toPhone?: string;
  };
  orderBy: { createdAt: "desc" };
  select: { status: true; errorMessage: true };
};

type SmsLogPrismaClient = {
  smsNotification: {
    findFirst: (args: SmsNotificationFindFirstArgs) => Promise<SmsNotificationLiteRow | null>;
  };
};

const smsLogPrisma = prisma as unknown as SmsLogPrismaClient;

// Stage-based fee creation support (ECDE / Primary)
type FeeFrequencyLiteral = "TERMLY" | "YEARLY" | "ONE_TIME";

type EducationStageLiteral =
  | "PRE_PRIMARY"
  | "LOWER_PRIMARY"
  | "UPPER_PRIMARY"
  | "JUNIOR_SECONDARY"
  | "SENIOR_SECONDARY";

type GradeRow = {
  id: number;
  level: number;
  stage: EducationStageLiteral | null;
};

type ClassRow = {
  id: number;
  gradeId: number;
};

type FeeCategoryRow = {
  id: number;
  name: string;
  frequency: FeeFrequencyLiteral;
};

type ClassFeeStructureLiteRow = {
  id: number;
  classId: number;
  feeCategoryId: number;
  term: Term | null;
  academicYear: number | null;
  amount: number;
  active: boolean;
};

type StudentRow = {
  id: string;
  classId: number;
};

type StudentFeeLiteRow = {
  id: string;
  studentId: string;
  feeCategoryId: number | null;
  term: Term | null;
  academicYear: number | null;
  baseAmount: number | null;
  amountDue: number;
  amountPaid: number;
  locked: boolean;
  status: string;
};

type StageFeePrismaClient = {
  grade: {
    findMany: (args: {
      where?: {
        stage?: EducationStageLiteral | { in?: ReadonlyArray<EducationStageLiteral> } | null;
        level?: { gte?: number; lte?: number };
      };
      select: { id: true; level: true; stage: true };
    }) => Promise<GradeRow[]>;
  };
  class: {
    findMany: (args: {
      where?: {
        gradeId?: { in?: ReadonlyArray<number> };
        schoolId?: number | null;
      };
      select: { id: true; gradeId: true };
    }) => Promise<ClassRow[]>;
  };
  feeCategory: {
    findUnique: (args: { where: { name: string } }) => Promise<FeeCategoryRow | null>;
    create: (args: {
      data: {
        name: string;
        frequency: FeeFrequencyLiteral;
        isRecurring: boolean;
        isEditable?: boolean;
        active?: boolean;
      };
    }) => Promise<FeeCategoryRow>;
  };
  classFeeStructure: {
    upsert: (args: {
      where: {
        classId_feeCategoryId_term_academicYear: {
          classId: number;
          feeCategoryId: number;
          term: Term | null;
          academicYear: number;
        };
      };
      update: { amount: number; active: boolean };
      create: {
        classId: number;
        feeCategoryId: number;
        term: Term | null;
        academicYear: number;
        amount: number;
        active: boolean;
      };
    }) => Promise<ClassFeeStructureLiteRow>;
  };
  student: {
    findMany: (args: {
      where: { classId: { in: ReadonlyArray<number> } };
      select: { id: true; classId: true };
    }) => Promise<StudentRow[]>;
  };
  studentFee: {
    findFirst: (args: {
      where: {
        studentId: string;
        feeCategoryId: number;
        term: Term | null;
        academicYear: number;
      };
    }) => Promise<StudentFeeLiteRow | null>;
    create: (args: {
      data: {
        studentId: string;
        feeCategoryId: number;
        term: Term | null;
        academicYear: number;
        baseAmount: number | null;
        amountDue: number;
        amountPaid: number;
        locked: boolean;
        sourceStructureId: number | null;
        status: string;
      };
    }) => Promise<StudentFeeLiteRow>;
    update: (args: {
      where: { id: string };
      data: {
        baseAmount?: number | null;
        amountDue?: number;
        locked?: boolean;
        status?: string;
        sourceStructureId?: number | null;
      };
    }) => Promise<StudentFeeLiteRow>;
  };
  auditLog: {
    create: (args: {
      data: {
        actorUserId: string;
        entity: string;
        entityId: string;
        oldValue: unknown;
        newValue: unknown;
        reason?: string | null;
      };
    }) => Promise<unknown>;
  };
  $transaction: <T>(ops: ReadonlyArray<Promise<T>>) => Promise<T[]>;
};

const stageFeePrisma = prisma as unknown as StageFeePrismaClient;

// Strong input types for server actions (no any)
export type CreateFeeStructureInput = {
  name: string;
  amountMinor: number; // minor units
  gradeId?: number;
  active?: boolean;
};

export const createFeeStructure = async (
  _state: { success: boolean; error: boolean },
  data: CreateFeeStructureInput
) => {
  try {
    await ensurePermission(["fees.write"]);
    await financePrisma.feeStructure.create({
      data: {
        name: data.name,
        amount: data.amountMinor,
        ...(typeof data.gradeId === "number" ? { gradeId: data.gradeId } : {}),
        ...(typeof data.active === "boolean" ? { active: data.active } : {}),
      },
    });
    revalidatePath("/finance/fees");
    return { success: true, error: false } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: true } as const;
  }
};

export type StageGroup = "ECDE" | "PRIMARY" | "JSS";

export type SimpleFeeFrequency = "TERMLY" | "YEARLY" | "ONE_TIME";

export type CreateStageFeeDefinitionInput = {
  feeName: string;
  amountMinor: number;
  frequency: SimpleFeeFrequency;
  stageGroup: StageGroup;
  academicYear: number;
  term?: Term;
};

export type CreateStageFeeDefinitionState = {
  success: boolean;
  error: boolean;
  message?: string;
};

export const createStageFeeDefinitionAndApply = async (
  _state: CreateStageFeeDefinitionState,
  input: CreateStageFeeDefinitionInput,
): Promise<CreateStageFeeDefinitionState> => {
  try {
    await ensurePermission(["fees.write"]);

    const authCtx = await getAuthContext();
    if (!authCtx) {
      return { success: false, error: true, message: "Unauthorized" };
    }

    const { schoolId } = await getCurrentSchoolContext();

    const { feeName, amountMinor, frequency, stageGroup, academicYear, term } = input;

    const trimmedName = feeName.trim();
    if (!trimmedName) {
      return { success: false, error: true, message: "Fee name is required" };
    }
    if (!Number.isFinite(amountMinor) || amountMinor < 0) {
      return { success: false, error: true, message: "Amount must be a non-negative minor-unit value" };
    }
    if (!Number.isFinite(academicYear) || academicYear < 2000 || academicYear > 3000) {
      return { success: false, error: true, message: "Academic year is invalid" };
    }
    if (frequency === "TERMLY" && !term) {
      return { success: false, error: true, message: "Term is required for termly fees" };
    }

    const frequencyLiteral: FeeFrequencyLiteral = frequency;

    // Resolve grades by stage group (ECDE / Primary / JSS)
    const gradeWhere: {
      stage?: EducationStageLiteral | { in?: ReadonlyArray<EducationStageLiteral> } | null;
      level?: { gte?: number; lte?: number };
    } = {};

    if (stageGroup === "ECDE") {
      gradeWhere.stage = "PRE_PRIMARY";
    } else if (stageGroup === "PRIMARY") {
      // Primary: rely primarily on level range so it still works if Grade.stage is not populated
      gradeWhere.level = { gte: 1, lte: 6 };
    } else if (stageGroup === "JSS") {
      // Junior Secondary: levels 7-9
      gradeWhere.level = { gte: 7, lte: 9 };
    }

    const grades = await stageFeePrisma.grade.findMany({
      where: gradeWhere,
      select: { id: true, level: true, stage: true },
    });

    if (grades.length === 0) {
      return {
        success: false,
        error: true,
        message: "No grades found for the selected stage group",
      };
    }

    const gradeIds = grades.map((g) => g.id);

    const classWhere: {
      gradeId?: { in?: ReadonlyArray<number> };
      schoolId?: number | null;
    } = { gradeId: { in: gradeIds } };

    if (schoolId !== null) {
      classWhere.schoolId = schoolId;
    }

    const classes = await stageFeePrisma.class.findMany({
      where: classWhere,
      select: { id: true, gradeId: true },
    });

    if (classes.length === 0) {
      return {
        success: false,
        error: true,
        message: "No classes found for the selected stage group and school",
      };
    }

    // Resolve or create FeeCategory
    let category = await stageFeePrisma.feeCategory.findUnique({
      where: { name: trimmedName },
    });

    if (category) {
      if (category.frequency !== frequencyLiteral) {
        return {
          success: false,
          error: true,
          message: "Fee category already exists with a different frequency",
        };
      }
    } else {
      const isRecurring = frequencyLiteral !== "ONE_TIME";
      category = await stageFeePrisma.feeCategory.create({
        data: {
          name: trimmedName,
          frequency: frequencyLiteral,
          isRecurring,
          isEditable: true,
          active: true,
        },
      });
    }

    const targetClassIds = classes.map((c) => c.id);

    const termForStructure: Term | null = frequencyLiteral === "TERMLY" ? term ?? null : null;

    // Upsert ClassFeeStructure rows per class
    const upsertedStructures: ClassFeeStructureLiteRow[] = [];

    if (targetClassIds.length > 0) {
      const upsertResults = await stageFeePrisma.$transaction(
        targetClassIds.map((classId) => {
          const where = {
            classId_feeCategoryId_term_academicYear: {
              classId,
              feeCategoryId: category.id,
              term: termForStructure,
              academicYear,
            },
          } as const;

          return stageFeePrisma.classFeeStructure.upsert({
            where,
            update: { amount: amountMinor, active: true },
            create: {
              classId,
              feeCategoryId: category.id,
              term: termForStructure,
              academicYear,
              amount: amountMinor,
              active: true,
            },
          });
        }),
      );

      upsertedStructures.push(...upsertResults);
    }

    // Apply to existing students in affected classes
    const students = await stageFeePrisma.student.findMany({
      where: { classId: { in: targetClassIds } },
      select: { id: true, classId: true },
    });

    const studentsByClass = new Map<number, string[]>();
    for (const stu of students) {
      const list = studentsByClass.get(stu.classId) ?? [];
      list.push(stu.id);
      studentsByClass.set(stu.classId, list);
    }

    for (const struct of upsertedStructures) {
      const classStudentIds = studentsByClass.get(struct.classId);
      if (!classStudentIds || classStudentIds.length === 0) {
        continue;
      }

      const targetTerm: Term | null = struct.term ?? "TERM1";

      for (const studentId of classStudentIds) {
        const existing = await stageFeePrisma.studentFee.findFirst({
          where: {
            studentId,
            feeCategoryId: struct.feeCategoryId,
            term: targetTerm,
            academicYear,
          },
        });

        if (!existing) {
          const status = amountMinor <= 0 ? "paid" : "unpaid";
          await stageFeePrisma.studentFee.create({
            data: {
              studentId,
              feeCategoryId: struct.feeCategoryId,
              term: targetTerm,
              academicYear,
              baseAmount: amountMinor,
              amountDue: amountMinor,
              amountPaid: 0,
              locked: false,
              sourceStructureId: struct.id,
              status,
            },
          });
          continue;
        }

        // If already paid more than new amount, lock and mark paid
        if (existing.amountPaid > amountMinor) {
          await stageFeePrisma.studentFee.update({
            where: { id: existing.id },
            data: {
              locked: true,
              sourceStructureId: struct.id,
              baseAmount: amountMinor,
              amountDue: amountMinor,
              status: "paid",
            },
          });
          continue;
        }

        // If locked, do not change monetary values; just keep link to source
        if (existing.locked) {
          await stageFeePrisma.studentFee.update({
            where: { id: existing.id },
            data: {
              sourceStructureId: struct.id,
            },
          });
          continue;
        }

        const newStatus =
          existing.amountPaid === amountMinor
            ? "paid"
            : existing.amountPaid > 0
            ? "partially_paid"
            : "unpaid";

        await stageFeePrisma.studentFee.update({
          where: { id: existing.id },
          data: {
            baseAmount: amountMinor,
            amountDue: amountMinor,
            status: newStatus,
            sourceStructureId: struct.id,
          },
        });
      }
    }

    await stageFeePrisma.auditLog.create({
      data: {
        actorUserId: authCtx.userId,
        entity: "stage_fee_definition",
        entityId: `${stageGroup}:${frequencyLiteral}:${academicYear}:${termForStructure ?? "-"}`,
        oldValue: null,
        newValue: {
          feeName: trimmedName,
          amountMinor,
          frequency: frequencyLiteral,
          stageGroup,
          academicYear,
          term: termForStructure,
          classIds: targetClassIds,
          feeCategoryId: category.id,
        },
        reason: null,
      },
    });

    revalidatePath("/finance/fees");
    revalidatePath("/finance/collections");

    return {
      success: true,
      error: false,
      message: "Stage-based fee definition created and applied",
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {
      success: false,
      error: true,
      message: "Failed to create and apply stage-based fee definition",
    };
  }
};

export type SendFeeReminderState = {
  success: boolean;
  error: boolean;
  message?: string;
};

const sendFeeReminderCore = async (studentFeeId: string): Promise<SendFeeReminderState> => {
  const fee = await reminderPrisma.studentFee.findUnique({
    where: { id: studentFeeId },
    select: {
      id: true,
      amountDue: true,
      amountPaid: true,
      dueDate: true,
      status: true,
      structure: { select: { name: true } } as { select: { name: true } } | null,
      student: {
        select: {
          id: true,
          name: true,
          surname: true,
          parent: { select: { id: true, phone: true, name: true, surname: true } },
        },
      },
    },
  } as ReminderStudentFeeFindUniqueArgs);

  if (!fee) {
    return { success: false, error: true, message: "Student fee not found" };
  }

  const parent = fee.student.parent;
  if (!parent || !parent.phone) {
    return {
      success: false,
      error: true,
      message: "Parent phone number is missing for this student",
    };
  }

  const outstanding = Math.max(fee.amountDue - fee.amountPaid, 0);
  if (outstanding <= 0) {
    return {
      success: false,
      error: true,
      message: "No outstanding balance for this student fee",
    };
  }

  const outstandingKes = (outstanding / 100).toFixed(2);
  const studentName = `${fee.student.name} ${fee.student.surname}`.trim();
  const today = new Date();
  const dueDate = fee.dueDate;
  const isOverdue = dueDate ? dueDate.getTime() < today.getTime() : false;
  const statusLabel = isOverdue ? "overdue" : "due";
  const duePart = dueDate ? ` (due ${dueDate.toISOString().slice(0, 10)})` : "";

  const feeName = fee.structure?.name ?? "school fees";
  const termLabel = fee.term ?? "current term";
  const yearLabel = typeof fee.academicYear === "number" ? String(fee.academicYear) : "";

  const allFees = await reminderPrisma.studentFee.findMany({
    where: {
      studentId: fee.student.id,
      ...(fee.term ? { term: fee.term } : {}),
      ...(typeof fee.academicYear === "number" ? { academicYear: fee.academicYear } : {}),
    },
    select: {
      amountDue: true,
      amountPaid: true,
    },
  } as ReminderStudentFeeFindManyArgs);

  const totalOutstandingMinor = allFees.reduce((sum, row) => {
    const rowOutstanding = Math.max(row.amountDue - row.amountPaid, 0);
    return sum + rowOutstanding;
  }, 0);

  const totalOutstandingKes = (totalOutstandingMinor / 100).toFixed(2);

  const body = `Fee reminder: ${studentName}'s ${feeName} fee for ${termLabel} ${yearLabel} has a balance of KES ${outstandingKes} (${statusLabel}${duePart}). Total outstanding fees: KES ${totalOutstandingKes}.`;

  await sendSms({
    toPhone: parent.phone,
    body,
    context: { kind: "FEE_REMINDER", relatedId: fee.id },
  });

  const latestNotification = await smsLogPrisma.smsNotification.findFirst({
    where: {
      kind: "FEE_REMINDER",
      relatedId: fee.id,
      toPhone: parent.phone,
    },
    orderBy: { createdAt: "desc" },
    select: { status: true, errorMessage: true },
  });

  if (!latestNotification) {
    return {
      success: true,
      error: false,
      message: `SMS reminder queued for parent ${parent.name} ${parent.surname}`.trim(),
    };
  }

  if (latestNotification.status === "SENT") {
    return {
      success: true,
      error: false,
      message: `SMS reminder sent to parent ${parent.name} ${parent.surname}`.trim(),
    };
  }

  if (latestNotification.status === "PENDING") {
    return {
      success: true,
      error: false,
      message: `SMS reminder queued for parent ${parent.name} ${parent.surname}`.trim(),
    };
  }

  const baseMessage = latestNotification.errorMessage ?? "SMS delivery failed. Please check SMS logs.";

  return {
    success: false,
    error: true,
    message: `SMS delivery failed: ${baseMessage}`,
  };
};

export const sendFeeReminder = async (
  _state: SendFeeReminderState,
  formData: FormData,
): Promise<SendFeeReminderState> => {
  try {
    await ensurePermission(["fees.write"]);

    const rawId = formData.get("studentFeeId");
    const studentFeeId = typeof rawId === "string" ? rawId.trim() : "";

    if (!studentFeeId) {
      return { success: false, error: true, message: "Student fee ID is required" };
    }

    return await sendFeeReminderCore(studentFeeId);
  } catch (e) {
    console.error(e);
    return { success: false, error: true, message: "Failed to send fee reminder" };
  }
};

export type SendBulkFeeRemindersState = {
  success: boolean;
  error: boolean;
  message?: string;
};

export const sendBulkFeeReminders = async (
  _state: SendBulkFeeRemindersState,
  formData: FormData,
): Promise<SendBulkFeeRemindersState> => {
  try {
    await ensurePermission(["fees.write"]);

    const rawYear = formData.get("year");
    const rawGradeId = formData.get("gradeId");
    const rawClassId = formData.get("classId");

    const yearString = typeof rawYear === "string" ? rawYear.trim() : "";
    const year = Number.parseInt(yearString, 10);

    if (!Number.isFinite(year)) {
      return { success: false, error: true, message: "Invalid or missing year" };
    }

    const gradeIdNumber =
      typeof rawGradeId === "string" && rawGradeId.trim().length > 0
        ? Number.parseInt(rawGradeId.trim(), 10)
        : undefined;
    const classIdNumber =
      typeof rawClassId === "string" && rawClassId.trim().length > 0
        ? Number.parseInt(rawClassId.trim(), 10)
        : undefined;

    type BulkRow = {
      id: string;
      amountDue: number;
      amountPaid: number;
    };

    const where: {
      academicYear: number;
      student?: { gradeId?: number; classId?: number };
    } = {
      academicYear: year,
    };

    if (typeof gradeIdNumber === "number" && !Number.isNaN(gradeIdNumber)) {
      where.student = { ...(where.student ?? {}), gradeId: gradeIdNumber };
    }
    if (typeof classIdNumber === "number" && !Number.isNaN(classIdNumber)) {
      where.student = { ...(where.student ?? {}), classId: classIdNumber };
    }

    const rawFees = await prisma.studentFee.findMany({
      where,
      select: {
        id: true,
        amountDue: true,
        amountPaid: true,
      },
    });

    const rows: BulkRow[] = rawFees;

    const targetIds: string[] = [];
    for (const row of rows) {
      const outstanding = Math.max(row.amountDue - row.amountPaid, 0);
      if (outstanding > 0) {
        targetIds.push(row.id);
      }
    }

    if (targetIds.length === 0) {
      return {
        success: false,
        error: true,
        message: "No outstanding balances for the current filters",
      };
    }

    let successCount = 0;
    let errorCount = 0;

    const baseState: SendFeeReminderState = { success: false, error: false };

    for (const id of targetIds) {
      const result = await sendFeeReminderCore(id);
      if (result.success) {
        successCount += 1;
      } else {
        errorCount += 1;
      }
    }

    const parts: string[] = [];
    parts.push(`Queued ${successCount} reminder(s)`);
    if (errorCount > 0) {
      parts.push(`${errorCount} failed`);
    }

    return {
      success: errorCount === 0,
      error: errorCount > 0,
      message: parts.join("; "),
    };
  } catch (e) {
    console.error(e);
    return { success: false, error: true, message: "Failed to send bulk fee reminders" };
  }
};

export type AdjustStudentFeeState = {
  success: boolean;
  error: boolean;
  message?: string;
};

const computeStudentFeeStatus = (amountDue: number, amountPaid: number): StudentFeeStatus => {
  if (amountPaid <= 0) {
    return amountDue <= 0 ? "paid" : "unpaid";
  }
  if (amountPaid >= amountDue) {
    return "paid";
  }
  return "partially_paid";
};

export const adjustStudentFee = async (
  _state: AdjustStudentFeeState,
  formData: FormData,
): Promise<AdjustStudentFeeState> => {
  try {
    await ensurePermission(["fees.write"]);

    const rawId = formData.get("studentFeeId");
    const rawAmountKes = formData.get("newAmountKes");
    const rawReason = formData.get("discountReason");

    const studentFeeId = typeof rawId === "string" ? rawId.trim() : "";
    const amountKesString = typeof rawAmountKes === "string" ? rawAmountKes.trim() : "";
    const discountReason = typeof rawReason === "string" && rawReason.trim().length > 0 ? rawReason.trim() : null;

    if (!studentFeeId) {
      return { success: false, error: true, message: "Student fee ID is required" };
    }

    const amountKesNumber = Number(amountKesString);
    if (!Number.isFinite(amountKesNumber) || amountKesNumber < 0) {
      return { success: false, error: true, message: "New amount must be a non-negative number" };
    }

    const newAmountMinor = Math.round(amountKesNumber * 100);

    const existing = await financePrisma.studentFee.findUnique({
      where: { id: studentFeeId },
      select: {
        id: true,
        baseAmount: true,
        amountDue: true,
        amountPaid: true,
        locked: true,
        status: true,
      },
    });

    if (!existing) {
      return { success: false, error: true, message: "Student fee not found" };
    }

    const baseAmount: number | null =
      typeof existing.baseAmount === "number" ? existing.baseAmount : existing.amountDue;

    const nextStatus = computeStudentFeeStatus(newAmountMinor, existing.amountPaid);

    await financePrisma.studentFee.update({
      where: { id: existing.id },
      data: {
        baseAmount,
        amountDue: newAmountMinor,
        // amountPaid stays as-is
        locked: true,
        status: nextStatus,
        discountReason,
      },
    });

    revalidatePath("/finance/collections");

    return { success: true, error: false, message: "Student fee adjusted" };
  } catch (e) {
    console.error(e);
    return { success: false, error: true, message: "Failed to adjust student fee" };
  }
};

export type CreateInvoiceInput = {
  studentId: string;
  term: Term;
  dueDate: string; // ISO date string
  totalAmountMinor: number;
};

export const createInvoice = async (
  _state: { success: boolean; error: boolean },
  data: CreateInvoiceInput
) => {
  try {
    await ensurePermission(["fees.write"]);
    await financePrisma.invoice.create({
      data: {
        studentId: data.studentId,
        term: data.term,
        dueDate: new Date(data.dueDate),
        totalAmount: data.totalAmountMinor,
        status: "PENDING",
      },
    });
    revalidatePath("/finance/invoices");
    return { success: true, error: false } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: true } as const;
  }
};

export type RecordPaymentInput = {
  invoiceId: number;
  amountMinor: number;
  method: PaymentMethod;
  reference?: string;
  paidAt?: string; // ISO date string
};

const computeInvoiceStatus = (
  total: number,
  paid: number
): InvoiceStatus => {
  if (paid <= 0) return "PENDING";
  if (paid < total) return "PARTIALLY_PAID";
  return "PAID";
};

const generateInvoiceCashReference = (invoiceId: number): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;
  return `CASH-INV-${invoiceId}-${datePart}`;
};

export const recordPayment = async (
  _state: { success: boolean; error: boolean; message?: string },
  data: RecordPaymentInput
) => {
  try {
    await ensurePermission(["payments.write"]);

    const inv = await financePrisma.invoice.findUnique({
      where: { id: data.invoiceId },
      select: { id: true, totalAmount: true, payments: { select: { amount: true } } },
    });
    if (!inv) throw new Error("Invoice not found");

    const trimmedReference = typeof data.reference === "string" ? data.reference.trim() : "";

    let finalReference: string;

    if (data.method === "CASH") {
      finalReference = trimmedReference || generateInvoiceCashReference(data.invoiceId);
    } else {
      if (!trimmedReference) {
        return {
          success: false,
          error: true,
          message: "Reference is required for non-cash payments",
        } as const;
      }
      finalReference = trimmedReference;
    }

    const existingPaid = inv.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    const newPaid = existingPaid + data.amountMinor;
    const newStatus = computeInvoiceStatus(inv.totalAmount, newPaid);

    await financePrisma.$transaction([
      financePrisma.payment.create({
        data: {
          invoiceId: data.invoiceId,
          amount: data.amountMinor,
          method: data.method,
          reference: finalReference,
          ...(data.paidAt ? { paidAt: new Date(data.paidAt) } : {}),
        },
      }),
      financePrisma.invoice.update({
        where: { id: data.invoiceId },
        data: { status: newStatus },
      }),
    ]);

    revalidatePath("/finance/invoices");
    return { success: true, error: false, message: "Payment recorded" } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: true, message: "Failed to record payment" } as const;
  }
};

export type CreateExpenseInput = {
  title: string;
  amountMinor: number;
  category: string;
  date?: string; // ISO
  notes?: string;
};

export const createExpense = async (
  _state: { success: boolean; error: boolean },
  data: CreateExpenseInput
) => {
  try {
    await ensurePermission(["expenses.write"]);

    const { schoolId } = await getCurrentSchoolContext();

    if (schoolId === null) {
      return { success: false, error: true } as const;
    }

    await financePrisma.expense.create({
      data: {
        title: data.title,
        amount: data.amountMinor,
        category: data.category,
        schoolId,
        ...(data.date ? { date: new Date(data.date) } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      },
    });
    revalidatePath("/finance/expenses");
    return { success: true, error: false } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: true } as const;
  }
};
