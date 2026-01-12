import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";

import type { C2bConfirmBody } from "@/app/api/mpesa/c2b/confirm/route";
import { POST as c2bConfirmHandler } from "@/app/api/mpesa/c2b/confirm/route";

interface PrismaMock {
  mpesaTransaction: {
    findFirst: Mock;
    create: Mock;
  };
  parent: {
    findMany: Mock;
  };
  student: {
    findMany: Mock;
  };
  feeCategory: {
    findUnique: Mock;
  };
  studentFee: {
    findFirst: Mock;
    findUnique: Mock;
  };
  studentPhoneAlias: {
    findMany: Mock;
    findFirst: Mock;
    create: Mock;
  };
}

vi.mock("@/lib/prisma", () => {
  const mock: PrismaMock = {
    mpesaTransaction: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    parent: {
      findMany: vi.fn(async () => []),
    },
    student: {
      findMany: vi.fn(async () => []),
    },
    feeCategory: {
      findUnique: vi.fn(),
    },
    studentFee: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    studentPhoneAlias: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };

  return {
    __esModule: true as const,
    default: mock,
  };
});

vi.mock("@/lib/studentFeePayments", () => {
  const applyStudentFeePayment = vi.fn();

  return {
    __esModule: true as const,
    applyStudentFeePayment,
  };
});

vi.mock("@/lib/schoolSettings", () => {
  const getSchoolSettingsDefaults = vi.fn(async () => ({
    academicYear: 2024,
    term: "TERM1" as const,
  }));

  return {
    __esModule: true as const,
    getSchoolSettingsDefaults,
  };
});

// Import mocked modules after vi.mock so we can access the mock instances safely
import prisma from "@/lib/prisma";
import { applyStudentFeePayment } from "@/lib/studentFeePayments";

const prismaMock = prisma as unknown as PrismaMock;
const applyStudentFeePaymentMock = applyStudentFeePayment as unknown as Mock;

const makeRequest = (body: C2bConfirmBody): NextRequest => {
  const reqLike = {
    json: async () => body,
    // NextRequest has more properties, but the handler only calls json().
  } as unknown as NextRequest;

  return reqLike;
};

const baseBody: C2bConfirmBody = {
  TransID: "ABC123",
  TransAmount: 100,
  BusinessShortCode: "529914",
  BillRefNumber: "51029",
  MSISDN: "0712345678",
  TransTime: "20240101010101",
  FirstName: "Test",
  MiddleName: undefined,
  LastName: "User",
};

describe("mpesa C2B confirm - legacy PayBill 529914", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates SUCCESS transaction and payment when there is a unique student and matching fee", async () => {
    prismaMock.mpesaTransaction.findFirst.mockResolvedValueOnce(null);

    prismaMock.parent.findMany.mockResolvedValueOnce([
      {
        students: [{ id: "student-1" }],
      },
    ]);

    prismaMock.student.findMany.mockResolvedValueOnce([]);

    prismaMock.feeCategory.findUnique.mockResolvedValueOnce({ id: 10 });

    prismaMock.studentFee.findFirst.mockResolvedValueOnce({ id: "fee-1" });

    prismaMock.studentFee.findUnique.mockResolvedValueOnce({ studentId: "student-1" });

    prismaMock.studentPhoneAlias.findFirst.mockResolvedValueOnce({ id: 1 });

    applyStudentFeePaymentMock.mockResolvedValueOnce({
      payment: { id: 99 },
      studentFee: { id: "fee-1" },
    });

    const res = await c2bConfirmHandler(makeRequest(baseBody));

    expect(res.status).toBe(200);

    expect(applyStudentFeePaymentMock).toHaveBeenCalledWith({
      studentFeeId: "fee-1",
      amountMinor: 10000,
      method: "MPESA",
      reference: baseBody.TransID,
    });

    expect(prismaMock.mpesaTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentFeeId: "fee-1",
        paymentId: 99,
        status: "SUCCESS",
        mpesaReceiptNumber: baseBody.TransID,
      }),
    });
  });

  it("marks transaction as PENDING with NO_STUDENT when no student matches the phone", async () => {
    prismaMock.mpesaTransaction.findFirst.mockResolvedValueOnce(null);

    prismaMock.parent.findMany.mockResolvedValueOnce([]);
    prismaMock.student.findMany.mockResolvedValueOnce([]);

    const res = await c2bConfirmHandler(makeRequest(baseBody));

    expect(res.status).toBe(200);

    expect(prismaMock.mpesaTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        reviewReason: "NO_STUDENT",
        studentFeeId: null,
      }),
    });

    expect(applyStudentFeePaymentMock).not.toHaveBeenCalled();
  });

  it("marks transaction as PENDING with MULTIPLE_STUDENTS when phone maps to more than one student", async () => {
    prismaMock.mpesaTransaction.findFirst.mockResolvedValueOnce(null);

    prismaMock.parent.findMany.mockResolvedValueOnce([
      {
        students: [{ id: "student-1" }, { id: "student-2" }],
      },
    ]);

    prismaMock.student.findMany.mockResolvedValueOnce([]);

    const res = await c2bConfirmHandler(makeRequest(baseBody));

    expect(res.status).toBe(200);

    expect(prismaMock.mpesaTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        reviewReason: "MULTIPLE_STUDENTS",
        studentFeeId: null,
      }),
    });

    expect(applyStudentFeePaymentMock).not.toHaveBeenCalled();
  });

  it("marks transaction as PENDING with NO_FEES when student is found but no outstanding fees exist", async () => {
    prismaMock.mpesaTransaction.findFirst.mockResolvedValueOnce(null);

    prismaMock.parent.findMany.mockResolvedValueOnce([
      {
        students: [{ id: "student-1" }],
      },
    ]);

    prismaMock.student.findMany.mockResolvedValueOnce([]);

    prismaMock.feeCategory.findUnique.mockResolvedValueOnce(null);
    prismaMock.studentFee.findFirst.mockResolvedValueOnce(null);

    const res = await c2bConfirmHandler(makeRequest(baseBody));

    expect(res.status).toBe(200);

    expect(prismaMock.mpesaTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        reviewReason: "NO_FEES",
        studentFeeId: null,
      }),
    });

    expect(applyStudentFeePaymentMock).not.toHaveBeenCalled();
  });

  it("matches student via StudentPhoneAlias when parent and student phones do not match", async () => {
    prismaMock.mpesaTransaction.findFirst.mockResolvedValueOnce(null);

    prismaMock.parent.findMany.mockResolvedValueOnce([]);
    prismaMock.student.findMany.mockResolvedValueOnce([]);

    prismaMock.studentPhoneAlias.findMany.mockResolvedValueOnce([
      { studentId: "student-1" },
    ]);

    prismaMock.feeCategory.findUnique.mockResolvedValueOnce({ id: 10 });
    prismaMock.studentFee.findFirst.mockResolvedValueOnce({ id: "fee-1" });
    prismaMock.studentFee.findUnique.mockResolvedValueOnce({ studentId: "student-1" });

    // No alias exists yet for normalized phone, so learning should insert one.
    prismaMock.studentPhoneAlias.findFirst.mockResolvedValueOnce(null);

    applyStudentFeePaymentMock.mockResolvedValueOnce({
      payment: { id: 99 },
      studentFee: { id: "fee-1" },
    });

    const res = await c2bConfirmHandler(makeRequest(baseBody));

    expect(res.status).toBe(200);

    expect(prismaMock.mpesaTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentFeeId: "fee-1",
        paymentId: 99,
        status: "SUCCESS",
      }),
    });

    expect(prismaMock.studentPhoneAlias.create).toHaveBeenCalledWith({
      data: {
        studentId: "student-1",
        phone: "254712345678",
      },
    });
  });

  it("learns a new StudentPhoneAlias on successful payment when none exists", async () => {
    prismaMock.mpesaTransaction.findFirst.mockResolvedValueOnce(null);

    prismaMock.parent.findMany.mockResolvedValueOnce([
      {
        students: [{ id: "student-1" }],
      },
    ]);

    prismaMock.student.findMany.mockResolvedValueOnce([]);
    prismaMock.studentPhoneAlias.findMany.mockResolvedValueOnce([]);

    prismaMock.feeCategory.findUnique.mockResolvedValueOnce({ id: 10 });
    prismaMock.studentFee.findFirst.mockResolvedValueOnce({ id: "fee-1" });
    prismaMock.studentFee.findUnique.mockResolvedValueOnce({ studentId: "student-1" });

    prismaMock.studentPhoneAlias.findFirst.mockResolvedValueOnce(null);

    applyStudentFeePaymentMock.mockResolvedValueOnce({
      payment: { id: 101 },
      studentFee: { id: "fee-1" },
    });

    const res = await c2bConfirmHandler(makeRequest(baseBody));

    expect(res.status).toBe(200);

    expect(prismaMock.studentPhoneAlias.create).toHaveBeenCalledWith({
      data: {
        studentId: "student-1",
        phone: "254712345678",
      },
    });
  });
});

describe("mpesa C2B confirm - Computer Studies PayBill 400200", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const computerStudiesBody: C2bConfirmBody = {
    TransID: "CS123",
    TransAmount: 1500,
    BusinessShortCode: "400200",
    BillRefNumber: "01109613617800",
    MSISDN: "0712345678",
    TransTime: "20240101010101",
    FirstName: "Test",
    MiddleName: undefined,
    LastName: "User",
  };

  it("allocates payment to oldest outstanding Computer Studies fee when student is matched by phone", async () => {
    prismaMock.mpesaTransaction.findFirst.mockResolvedValueOnce(null);

    prismaMock.parent.findMany.mockResolvedValueOnce([
      {
        students: [{ id: "student-1" }],
      },
    ]);

    prismaMock.student.findMany.mockResolvedValueOnce([]);

    prismaMock.studentPhoneAlias.findMany.mockResolvedValueOnce([]);

    prismaMock.feeCategory.findUnique.mockResolvedValueOnce({ id: 20 });

    prismaMock.studentFee.findFirst.mockResolvedValueOnce({ id: "cs-fee-1" });

    prismaMock.studentFee.findUnique.mockResolvedValueOnce({ studentId: "student-1" });

    prismaMock.studentPhoneAlias.findFirst.mockResolvedValueOnce(null);

    applyStudentFeePaymentMock.mockResolvedValueOnce({
      payment: { id: 200 },
      studentFee: { id: "cs-fee-1" },
    });

    const res = await c2bConfirmHandler(makeRequest(computerStudiesBody));

    expect(res.status).toBe(200);

    expect(applyStudentFeePaymentMock).toHaveBeenCalledWith({
      studentFeeId: "cs-fee-1",
      amountMinor: 150000,
      method: "MPESA",
      reference: computerStudiesBody.TransID,
    });

    expect(prismaMock.mpesaTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentFeeId: "cs-fee-1",
        paymentId: 200,
        status: "SUCCESS",
      }),
    });

    expect(prismaMock.studentPhoneAlias.create).toHaveBeenCalledWith({
      data: {
        studentId: "student-1",
        phone: "254712345678",
      },
    });
  });

  it("marks transaction as PENDING with NO_STUDENT when no student matches phone for Computer Studies PayBill", async () => {
    prismaMock.mpesaTransaction.findFirst.mockResolvedValueOnce(null);

    prismaMock.parent.findMany.mockResolvedValueOnce([]);
    prismaMock.student.findMany.mockResolvedValueOnce([]);
    prismaMock.studentPhoneAlias.findMany.mockResolvedValueOnce([]);

    const res = await c2bConfirmHandler(makeRequest(computerStudiesBody));

    expect(res.status).toBe(200);

    expect(prismaMock.mpesaTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        reviewReason: "NO_STUDENT",
        studentFeeId: null,
      }),
    });

    expect(applyStudentFeePaymentMock).not.toHaveBeenCalled();
  });

  it("marks transaction as PENDING with OTHER when BillRef is unexpected for Computer Studies PayBill", async () => {
    prismaMock.mpesaTransaction.findFirst.mockResolvedValueOnce(null);

    const bodyWithUnexpectedRef: C2bConfirmBody = {
      ...computerStudiesBody,
      BillRefNumber: "SOME-OTHER-REF",
    };

    const res = await c2bConfirmHandler(makeRequest(bodyWithUnexpectedRef));

    expect(res.status).toBe(200);

    expect(prismaMock.mpesaTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        reviewReason: "OTHER",
        studentFeeId: null,
      }),
    });

    expect(applyStudentFeePaymentMock).not.toHaveBeenCalled();
  });
});

describe("mpesa C2B confirm - shared M-Pesa till 5669463", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tillBody: C2bConfirmBody = {
    TransID: "TILL123",
    TransAmount: 500,
    BusinessShortCode: "5669463",
    BillRefNumber: "", // shared till, no specific account pattern
    MSISDN: "0712345678",
    TransTime: "20240101010101",
    FirstName: "Till",
    MiddleName: undefined,
    LastName: "Payer",
  };

  it("allocates payment to oldest outstanding non-Computer Studies fee when student is matched by phone", async () => {
    prismaMock.mpesaTransaction.findFirst.mockResolvedValueOnce(null);

    prismaMock.parent.findMany.mockResolvedValueOnce([
      {
        students: [{ id: "student-1" }],
      },
    ]);

    prismaMock.student.findMany.mockResolvedValueOnce([]);
    prismaMock.studentPhoneAlias.findMany.mockResolvedValueOnce([]);

    // First call for "Computer Studies" category lookup inside exclusion helper
    prismaMock.feeCategory.findUnique.mockResolvedValueOnce({ id: 30 });

    // Oldest non-Computer Studies StudentFee
    prismaMock.studentFee.findFirst.mockResolvedValueOnce({ id: "non-cs-fee-1" });

    prismaMock.studentFee.findUnique.mockResolvedValueOnce({ studentId: "student-1" });
    prismaMock.studentPhoneAlias.findFirst.mockResolvedValueOnce(null);

    applyStudentFeePaymentMock.mockResolvedValueOnce({
      payment: { id: 300 },
      studentFee: { id: "non-cs-fee-1" },
    });

    const res = await c2bConfirmHandler(makeRequest(tillBody));

    expect(res.status).toBe(200);

    expect(applyStudentFeePaymentMock).toHaveBeenCalledWith({
      studentFeeId: "non-cs-fee-1",
      amountMinor: 50000,
      method: "MPESA",
      reference: tillBody.TransID,
    });

    expect(prismaMock.mpesaTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentFeeId: "non-cs-fee-1",
        paymentId: 300,
        status: "SUCCESS",
      }),
    });
  });

  it("marks transaction as PENDING with NO_STUDENT when no student matches phone for shared till", async () => {
    prismaMock.mpesaTransaction.findFirst.mockResolvedValueOnce(null);

    prismaMock.parent.findMany.mockResolvedValueOnce([]);
    prismaMock.student.findMany.mockResolvedValueOnce([]);
    prismaMock.studentPhoneAlias.findMany.mockResolvedValueOnce([]);

    const res = await c2bConfirmHandler(makeRequest(tillBody));

    expect(res.status).toBe(200);

    expect(prismaMock.mpesaTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        reviewReason: "NO_STUDENT",
        studentFeeId: null,
      }),
    });

    expect(applyStudentFeePaymentMock).not.toHaveBeenCalled();
  });
});
