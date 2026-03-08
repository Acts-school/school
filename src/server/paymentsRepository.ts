import { isDesktopRuntime } from "./runtime";
import { getSqliteDb } from "./sqliteDb";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "POS" | "ONLINE" | "MPESA";

export interface PaymentItem {
  id: number;
  studentFeeId: string | null;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paidAt: Date;
}

export interface PaymentListParams {
  studentFeeId: string;
}

export interface CreatePaymentPayload {
  studentFeeId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  clientRequestId?: string | null;
  createdFromOffline?: boolean;
  userId: string;
  userRole: string;
}

export interface StudentFeeForPayment {
  id: string;
  amountDue: number;
  amountPaid: number;
  student: {
    parentId: string | null;
  };
}

export interface PaymentResult {
  payment: PaymentItem;
  studentFee: {
    id: string;
    amountDue: number;
    amountPaid: number;
    status: "unpaid" | "partially_paid" | "paid";
  };
}

export interface PaymentsRepository {
  list(params: PaymentListParams): Promise<PaymentItem[]>;
  create(payload: CreatePaymentPayload): Promise<PaymentResult>;
  findByClientRequestId(clientRequestId: string): Promise<PaymentItem | null>;
  findStudentFeeForPayment(studentFeeId: string): Promise<StudentFeeForPayment | null>;
}

async function getPrismaPaymentsRepository(): Promise<PaymentsRepository> {
  const prismaModule = await import("../lib/prisma");
  const prisma = prismaModule.default;

  return {
    async list(params) {
      const { studentFeeId } = params;
      
      const rawPayments = await prisma.payment.findMany({
        where: { studentFeeId },
        orderBy: { paidAt: "desc" },
      });

      return rawPayments.map((p) => ({
        id: p.id,
        studentFeeId,
        amount: p.amount,
        method: p.method as PaymentMethod,
        reference: p.reference ?? null,
        paidAt: p.paidAt,
      } as PaymentItem));
    },

    async create(payload) {
      const { studentFeeId, amount, method, reference, clientRequestId, createdFromOffline, userId, userRole } = payload;
      
      // Import the applyStudentFeePayment function
      const { applyStudentFeePayment } = await import("../lib/studentFeePayments");
      
      const amountMinor = Math.round(amount * 100);
      
      const { payment, studentFee } = await applyStudentFeePayment({
        studentFeeId,
        amountMinor,
        method,
        reference: reference ?? null,
        clientRequestId: clientRequestId ?? null,
        createdFromOffline: createdFromOffline ?? false,
      });

      return {
        payment: {
          id: payment.id,
          studentFeeId: payment.studentFeeId,
          amount: payment.amount,
          method: payment.method as PaymentMethod,
          reference: payment.reference ?? null,
          paidAt: payment.paidAt,
        } as PaymentItem,
        studentFee: {
          id: studentFee.id,
          amountDue: studentFee.amountDue,
          amountPaid: studentFee.amountPaid,
          status: studentFee.status as "unpaid" | "partially_paid" | "paid",
        },
      };
    },

    async findByClientRequestId(clientRequestId) {
      const payment = await prisma.payment.findUnique({
        where: { clientRequestId },
      });

      if (!payment) return null;

      return {
        id: payment.id,
        studentFeeId: payment.studentFeeId,
        amount: payment.amount,
        method: payment.method as PaymentMethod,
        reference: payment.reference ?? null,
        paidAt: payment.paidAt,
      } as PaymentItem;
    },

    async findStudentFeeForPayment(studentFeeId) {
      const fee = await prisma.studentFee.findUnique({
        where: { id: studentFeeId },
        select: {
          id: true,
          amountDue: true,
          amountPaid: true,
          student: {
            select: {
              parentId: true,
            },
          },
        },
      });

      if (!fee) return null;

      return fee as StudentFeeForPayment;
    },
  };
}

function getSqlitePaymentsRepository(): PaymentsRepository {
  const db = getSqliteDb();

  const computeStudentFeeStatus = (amountDue: number, amountPaid: number): "unpaid" | "partially_paid" | "paid" => {
    if (amountPaid <= 0) {
      return amountDue <= 0 ? "paid" : "unpaid";
    }

    if (amountPaid >= amountDue) {
      return "paid";
    }

    return "partially_paid";
  };

  const generateCashReference = (studentFeeId: string): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const datePart = `${year}${month}${day}`;
    const suffix = studentFeeId.slice(-6);
    return `CASH-${datePart}-${suffix}`;
  };

  return {
    async list(params) {
      const { studentFeeId } = params;
      
      const stmt = db.prepare(`
        SELECT id, student_fee_id, amount, method, reference, paid_at
        FROM payment 
        WHERE student_fee_id = ?
        ORDER BY paid_at DESC
      `);
      
      const rows = stmt.all(studentFeeId) as any[];

      return rows.map((row) => ({
        id: row.id as number,
        studentFeeId: row.student_fee_id as string,
        amount: row.amount as number,
        method: row.method as PaymentMethod,
        reference: row.reference as string | null,
        paidAt: new Date(row.paid_at) as Date,
      } as PaymentItem));
    },

    async create(payload) {
      const { studentFeeId, amount, method, reference, clientRequestId, createdFromOffline, userId, userRole } = payload;
      
      const amountMinor = Math.round(amount * 100);
      
      // Get the current student fee
      const feeStmt = db.prepare(`
        SELECT id, amount_due, amount_paid
        FROM student_fee 
        WHERE id = ?
      `);
      
      const fee = feeStmt.get(studentFeeId) as any;
      
      if (!fee) {
        throw new Error("Student fee not found");
      }

      const newAmountPaid = fee.amount_paid + amountMinor;
      const status = computeStudentFeeStatus(fee.amount_due, newAmountPaid);

      // Use a transaction to ensure consistency
      const transaction = db.transaction(() => {
        // Create payment
        const paymentStmt = db.prepare(`
          INSERT INTO payment (student_fee_id, amount, method, reference, client_request_id, created_from_offline, paid_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const paymentResult = paymentStmt.run(
          studentFeeId,
          amountMinor,
          method,
          reference || null,
          clientRequestId || null,
          createdFromOffline ? 1 : 0,
          new Date().toISOString()
        );

        // Update student fee
        const updateFeeStmt = db.prepare(`
          UPDATE student_fee 
          SET amount_paid = ?, status = ?
          WHERE id = ?
        `);
        
        updateFeeStmt.run(newAmountPaid, status, studentFeeId);

        return paymentResult.lastInsertRowid as number;
      });

      const paymentId = transaction();

      // Get the created payment
      const createdPaymentStmt = db.prepare(`
        SELECT id, student_fee_id, amount, method, reference, paid_at
        FROM payment 
        WHERE id = ?
      `);
      
      const payment = createdPaymentStmt.get(paymentId) as any;

      // Get the updated student fee
      const updatedFeeStmt = db.prepare(`
        SELECT id, amount_due, amount_paid, status
        FROM student_fee 
        WHERE id = ?
      `);
      
      const updatedFee = updatedFeeStmt.get(studentFeeId) as any;

      return {
        payment: {
          id: payment.id,
          studentFeeId: payment.student_fee_id,
          amount: payment.amount,
          method: payment.method as PaymentMethod,
          reference: payment.reference as string | null,
          paidAt: new Date(payment.paid_at) as Date,
        } as PaymentItem,
        studentFee: {
          id: updatedFee.id,
          amountDue: updatedFee.amount_due,
          amountPaid: updatedFee.amount_paid,
          status: updatedFee.status as "unpaid" | "partially_paid" | "paid",
        },
      };
    },

    async findByClientRequestId(clientRequestId) {
      const stmt = db.prepare(`
        SELECT id, student_fee_id, amount, method, reference, paid_at
        FROM payment 
        WHERE client_request_id = ?
      `);
      
      const row = stmt.get(clientRequestId) as any;
      
      if (!row) return null;

      return {
        id: row.id as number,
        studentFeeId: row.student_fee_id as string,
        amount: row.amount as number,
        method: row.method as PaymentMethod,
        reference: row.reference as string | null,
        paidAt: new Date(row.paid_at) as Date,
      } as PaymentItem;
    },

    async findStudentFeeForPayment(studentFeeId) {
      const stmt = db.prepare(`
        SELECT sf.id, sf.amount_due, sf.amount_paid, s.parent_id
        FROM student_fee sf
        LEFT JOIN student s ON sf.student_id = s.id
        WHERE sf.id = ?
      `);
      
      const row = stmt.get(studentFeeId) as any;
      
      if (!row) return null;

      return {
        id: row.id,
        amountDue: row.amount_due,
        amountPaid: row.amount_paid,
        student: {
          parentId: row.parent_id,
        },
      } as StudentFeeForPayment;
    },
  };
}

export async function getPaymentsRepository(): Promise<PaymentsRepository> {
  if (isDesktopRuntime()) {
    return getSqlitePaymentsRepository();
  } else {
    return getPrismaPaymentsRepository();
  }
}
