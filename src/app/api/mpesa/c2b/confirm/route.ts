import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { applyStudentFeePayment } from "@/lib/studentFeePayments";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";

const c2bConfirmSchema = z.object({
  TransID: z.string(),
  TransAmount: z.union([z.string(), z.number()]),
  BusinessShortCode: z.string(),
  BillRefNumber: z.string().optional(),
  MSISDN: z.string().optional(),
  TransTime: z.string().optional(),
  FirstName: z.string().optional(),
  MiddleName: z.string().optional(),
  LastName: z.string().optional(),
});

export type C2bConfirmBody = z.infer<typeof c2bConfirmSchema>;

const LEGACY_PAYBILL_SHORTCODE = "529914";
const COMPUTER_STUDIES_PAYBILL_SHORTCODE = "400200";
const COMPUTER_STUDIES_BILLREF = "01109613617800";
const COMPUTER_STUDIES_CATEGORY_NAME = "Computer Studies";
const SHARED_TILL_SHORTCODE = "5669463";

type MpesaReviewReasonLocal = "NO_STUDENT" | "MULTIPLE_STUDENTS" | "NO_FEES" | "OTHER";

type StudentMsisdnMatch = {
  uniqueStudentId: string | null;
  matchCount: number;
};

const normalizeMsisdn = (msisdnRaw: string | undefined): string | null => {
  if (!msisdnRaw) {
    return null;
  }

  const digits = msisdnRaw.replace(/\D/g, "");

  if (digits.startsWith("254") && digits.length === 12) {
    return digits;
  }

  if (digits.length === 10 && digits.startsWith("0")) {
    return `254${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `254${digits}`;
  }

  return null;
};

const mapFeeCodeToCategoryName = (feeCode: string): string | null => {
  const feeCodeMap: Record<string, string> = {
    TUI: "Tuition",
    MEA: "Meals",
    TRN: "Transport",
    EXM: "Exams",
  };

  return feeCodeMap[feeCode] ?? null;
};

const ensureStudentPhoneAlias = async (studentId: string, normalizedMsisdn: string): Promise<void> => {
  const existing = await prisma.studentPhoneAlias.findFirst({
    where: {
      studentId,
      phone: normalizedMsisdn,
    },
    select: { id: true },
  });

  if (!existing) {
    await prisma.studentPhoneAlias.create({
      data: {
        studentId,
        phone: normalizedMsisdn,
      },
    });
  }
};

const findStudentFeeIdForStudentRefAndCategory = async (
  studentRef: string,
  feeCategoryName: string,
): Promise<string | null> => {
  const student = await prisma.student.findUnique({
    where: { username: studentRef },
    select: { id: true },
  });

  if (!student) {
    return null;
  }

  const feeCategory = await prisma.feeCategory.findUnique({
    where: { name: feeCategoryName },
    select: { id: true },
  });

  if (!feeCategory) {
    return null;
  }

  const { academicYear, term } = await getSchoolSettingsDefaults();

  const studentFee = await prisma.studentFee.findFirst({
    where: {
      studentId: student.id,
      feeCategoryId: feeCategory.id,
      academicYear,
      term,
    },
    select: { id: true },
  });

  return studentFee?.id ?? null;
};

const findOldestOutstandingStudentFeeIdForStudentAndCategory = async (
  studentId: string,
  feeCategoryName: string,
): Promise<string | null> => {
  const feeCategory = await prisma.feeCategory.findUnique({
    where: { name: feeCategoryName },
    select: { id: true },
  });

  if (!feeCategory) {
    return null;
  }

  const studentFee = await prisma.studentFee.findFirst({
    where: {
      studentId,
      feeCategoryId: feeCategory.id,
      status: { in: ["unpaid", "partially_paid"] },
    },
    orderBy: [
      { dueDate: "asc" },
      { createdAt: "asc" },
    ],
    select: { id: true },
  });

  return studentFee?.id ?? null;
};

const findStudentFeeIdForStudentAndCategory = async (
  studentId: string,
  feeCategoryName: string,
): Promise<string | null> => {
  const feeCategory = await prisma.feeCategory.findUnique({
    where: { name: feeCategoryName },
    select: { id: true },
  });

  if (!feeCategory) {
    return null;
  }

  const { academicYear, term } = await getSchoolSettingsDefaults();

  const studentFee = await prisma.studentFee.findFirst({
    where: {
      studentId,
      feeCategoryId: feeCategory.id,
      academicYear,
      term,
    },
    select: { id: true },
  });

  return studentFee?.id ?? null;
};

const findOldestOutstandingStudentFeeIdForStudent = async (studentId: string): Promise<string | null> => {
  const studentFee = await prisma.studentFee.findFirst({
    where: {
      studentId,
      status: { in: ["unpaid", "partially_paid"] },
    },
    orderBy: [
      { dueDate: "asc" },
      { createdAt: "asc" },
    ],
    select: { id: true },
  });

  return studentFee?.id ?? null;
};

const findOldestOutstandingStudentFeeIdForStudentExcludingCategory = async (
  studentId: string,
  feeCategoryName: string,
): Promise<string | null> => {
  const feeCategory = await prisma.feeCategory.findUnique({
    where: { name: feeCategoryName },
    select: { id: true },
  });

  const where: Prisma.StudentFeeWhereInput = {
    studentId,
    status: { in: ["unpaid", "partially_paid"] },
  };

  if (feeCategory) {
    where.NOT = { feeCategoryId: feeCategory.id };
  }

  const studentFee = await prisma.studentFee.findFirst({
    where,
    orderBy: [
      { dueDate: "asc" },
      { createdAt: "asc" },
    ],
    select: { id: true },
  });

  return studentFee?.id ?? null;
};

const findStudentMatchByMsisdn = async (normalizedMsisdn: string): Promise<StudentMsisdnMatch> => {
  const lastNine = normalizedMsisdn.slice(-9);

  const parents = await prisma.parent.findMany({
    where: { phone: { endsWith: lastNine } },
    select: {
      students: {
        select: { id: true },
      },
    },
  });

  const studentIdsFromParents = parents.flatMap((parentRecord) =>
    parentRecord.students.map((studentRecord) => studentRecord.id),
  );

  const students = await prisma.student.findMany({
    where: { phone: { endsWith: lastNine } },
    select: { id: true },
  });

  const studentIdsFromStudents = students.map((studentRecord) => studentRecord.id);

  const aliases = await prisma.studentPhoneAlias.findMany({
    where: { phone: { endsWith: lastNine } },
    select: { studentId: true },
  });

  const studentIdsFromAliases = aliases.map((aliasRecord: { studentId: string }) => aliasRecord.studentId);

  const allIdsSet = new Set<string>([...studentIdsFromParents, ...studentIdsFromStudents, ...studentIdsFromAliases]);

  const allIds = Array.from(allIdsSet);

  if (allIds.length === 1) {
    return {
      uniqueStudentId: allIds[0] ?? null,
      matchCount: 1,
    };
  }

  return {
    uniqueStudentId: null,
    matchCount: allIds.length,
  };
};

export async function POST(req: NextRequest): Promise<NextResponse<{ ResultCode: string; ResultDesc: string }>> {
  const json = (await req.json()) as unknown;
  const parsed = c2bConfirmSchema.safeParse(json);

  if (!parsed.success) {
    // For robustness, still ACK so Safaricom does not retry indefinitely.
    return NextResponse.json({ ResultCode: "0", ResultDesc: "Received" });
  }

  const data = parsed.data;

  // De-dupe by M-Pesa receipt number (TransID)
  const existing = await prisma.mpesaTransaction.findFirst({
    where: { mpesaReceiptNumber: data.TransID },
  });

  if (existing) {
    return NextResponse.json({ ResultCode: "0", ResultDesc: "Received" });
  }

  const amountNumber = typeof data.TransAmount === "number" ? data.TransAmount : Number(data.TransAmount);
  const amountMinor = Number.isFinite(amountNumber) ? Math.round(amountNumber * 100) : 0;
  const normalizedMsisdn = normalizeMsisdn(data.MSISDN);
  const phoneForStorage = normalizedMsisdn ?? data.MSISDN ?? "UNKNOWN";
  const billRefRaw = data.BillRefNumber?.trim() ?? "";
  const [studentRefRaw, feeCodeRaw] = billRefRaw.split("-");
  const studentRef = (studentRefRaw ?? "").trim();
  const feeCodeFromBillRef = (feeCodeRaw ?? "").trim().toUpperCase();
  const businessShortCode = data.BusinessShortCode.trim();

  let studentFeeId: string | null = null;
  let matchInfo: StudentMsisdnMatch | null = null;
  let reviewReason: MpesaReviewReasonLocal | null = null;

  if (businessShortCode === COMPUTER_STUDIES_PAYBILL_SHORTCODE && billRefRaw === COMPUTER_STUDIES_BILLREF) {
    if (normalizedMsisdn) {
      matchInfo = await findStudentMatchByMsisdn(normalizedMsisdn);
    }

    const studentIdFromPhone = matchInfo?.uniqueStudentId ?? null;

    if (studentIdFromPhone) {
      studentFeeId = await findOldestOutstandingStudentFeeIdForStudentAndCategory(
        studentIdFromPhone,
        COMPUTER_STUDIES_CATEGORY_NAME,
      );
    }
  } else if (businessShortCode === LEGACY_PAYBILL_SHORTCODE) {
    if (normalizedMsisdn) {
      matchInfo = await findStudentMatchByMsisdn(normalizedMsisdn);
    }

    const studentIdFromPhone = matchInfo?.uniqueStudentId ?? null;

    if (studentIdFromPhone) {
      let feeCode = "";

      if (feeCodeFromBillRef) {
        feeCode = feeCodeFromBillRef;
      } else if (billRefRaw.length === 3) {
        feeCode = billRefRaw.toUpperCase();
      }

      let feeCategoryName: string | null = null;

      if (feeCode) {
        feeCategoryName = mapFeeCodeToCategoryName(feeCode);
      }

      if (feeCategoryName) {
        studentFeeId = await findStudentFeeIdForStudentAndCategory(studentIdFromPhone, feeCategoryName);
      }

      if (!studentFeeId) {
        studentFeeId = await findOldestOutstandingStudentFeeIdForStudent(studentIdFromPhone);
      }
    } else if (studentRef && feeCodeFromBillRef) {
      const feeCategoryName = mapFeeCodeToCategoryName(feeCodeFromBillRef);

      if (feeCategoryName) {
        studentFeeId = await findStudentFeeIdForStudentRefAndCategory(studentRef, feeCategoryName);
      }
    }
  } else if (businessShortCode === SHARED_TILL_SHORTCODE) {
    if (normalizedMsisdn) {
      matchInfo = await findStudentMatchByMsisdn(normalizedMsisdn);
    }

    const studentIdFromPhone = matchInfo?.uniqueStudentId ?? null;

    if (studentIdFromPhone) {
      studentFeeId = await findOldestOutstandingStudentFeeIdForStudentExcludingCategory(
        studentIdFromPhone,
        COMPUTER_STUDIES_CATEGORY_NAME,
      );
    }
  } else if (studentRef && feeCodeFromBillRef) {
    const feeCategoryName = mapFeeCodeToCategoryName(feeCodeFromBillRef);

    if (feeCategoryName) {
      studentFeeId = await findStudentFeeIdForStudentRefAndCategory(studentRef, feeCategoryName);
    }
  }

  if (studentFeeId) {
    try {
      const { payment } = await applyStudentFeePayment({
        studentFeeId,
        amountMinor,
        method: "MPESA",
        reference: data.TransID,
      });

      if (normalizedMsisdn) {
        const studentFeeRecord = await prisma.studentFee.findUnique({
          where: { id: studentFeeId },
          select: { studentId: true },
        });

        if (studentFeeRecord) {
          await ensureStudentPhoneAlias(studentFeeRecord.studentId, normalizedMsisdn);
        }
      }

      await prisma.mpesaTransaction.create({
        data: {
          studentFeeId,
          paymentId: payment.id,
          phoneNumber: phoneForStorage,
          amount: amountMinor,
          status: "SUCCESS",
          mpesaReceiptNumber: data.TransID,
          rawCallback: json as Prisma.InputJsonValue,
        },
      });
    } catch {
      // If applying payment fails, still record the raw transaction as pending for manual follow-up.
      reviewReason = "OTHER";
      await prisma.mpesaTransaction.create({
        data: {
          studentFeeId,
          phoneNumber: phoneForStorage,
          amount: amountMinor,
          status: "PENDING",
          reviewReason,
          mpesaReceiptNumber: data.TransID,
          rawCallback: json as Prisma.InputJsonValue,
        },
      });
    }
  } else {
    // Unmatched transaction: record it for manual reconciliation.
    if (businessShortCode === COMPUTER_STUDIES_PAYBILL_SHORTCODE && billRefRaw !== COMPUTER_STUDIES_BILLREF) {
      reviewReason = "OTHER";
    } else if (matchInfo) {
      if (matchInfo.matchCount === 0) {
        reviewReason = "NO_STUDENT";
      } else if (matchInfo.matchCount > 1) {
        reviewReason = "MULTIPLE_STUDENTS";
      } else if (matchInfo.matchCount === 1) {
        reviewReason = "NO_FEES";
      }
    } else if (studentRef && feeCodeFromBillRef) {
      reviewReason = "NO_FEES";
    } else {
      reviewReason = "NO_STUDENT";
    }

    await prisma.mpesaTransaction.create({
      data: {
        studentFeeId: null,
        phoneNumber: phoneForStorage,
        amount: amountMinor,
        status: "PENDING",
        reviewReason,
        mpesaReceiptNumber: data.TransID,
        rawCallback: json as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({ ResultCode: "0", ResultDesc: "Received" });
}
