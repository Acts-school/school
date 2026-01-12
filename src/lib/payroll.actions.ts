"use server";

import { revalidatePath } from "next/cache";
import prisma from "./prisma";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";
import type { PaymentMethod } from "./fees.actions";

// Local enum aliases mirroring Prisma enums (no dependency on generated client types)
export type StaffRole =
  | "ADMIN"
  | "TEACHER"
  | "ACCOUNTANT"
  | "NON_TEACHING"
  | "SUPPORT"
  | "OTHER";

export type PayrollPeriodStatus = "OPEN" | "APPROVED" | "PAID" | "CANCELLED";

export type PayrollStatus = "DRAFT" | "APPROVED" | "PAID";

export type BudgetStatus = "DRAFT" | "APPROVED" | "ARCHIVED";

export type BudgetItemKind = "OVERHEAD" | "STAFF" | "INCOME" | "OTHER";

// Narrowed Prisma facade for payroll-related models

type PayrollPeriodRow = {
  id: number;
  year: number;
  month: number;
  status: PayrollPeriodStatus;
};

type StaffRow = {
  id: string;
  role: StaffRole;
  basicSalary: number;
};

type StaffPayrollNetRow = {
  netPay: number;
};

type PayrollPeriodCreateArgs = {
  data: {
    year: number;
    month: number;
    status?: PayrollPeriodStatus;
    schoolId?: number | null;
  };
};

type StaffPayrollFindMany = {
  (args: StaffPayrollNetFindManyArgs): Promise<StaffPayrollNetRow[]>;
  (args: StaffPayrollForPrefillFindManyArgs): Promise<StaffPayrollForPrefillRow[]>;
};

type PayrollPeriodFindFirstArgs = {
  where: {
    year: number;
    month: number;
    schoolId?: number | null;
  };
};

type PayrollPeriodFindUniqueArgs = {
  where: {
    id: number;
  };
  select: {
    year: true;
    month: true;
    schoolId: true;
  };
};

type PayrollPeriodUpdateArgs = {
  where: {
    id: number;
  };
  data: {
    status?: PayrollPeriodStatus;
    closedAt?: Date | null;
  };
};

type StaffFindManyArgs = {
  where: {
    active: boolean;
  };
  select: {
    id: true;
    role: true;
    basicSalary: true;
  };
};

type StaffPayrollCreateArgs = {
  data: {
    periodId: number;
    staffId: string;
    staffRole: StaffRole;
    basicSalary: number;
    allowances: number;
    deductions: number;
    netPay: number;
    status: PayrollStatus;
  };
};

type StaffPayrollUpdateArgs = {
  where: {
    id: number;
  };
  data: {
    basicSalary?: number;
    allowances?: number;
    deductions?: number;
    netPay?: number;
    status?: PayrollStatus;
    notes?: string;
    paymentMethod?: PaymentMethod | null;
    paymentReference?: string | null;
    paidAt?: Date | null;
  };
};
 
type StaffPayrollNetFindManyArgs = {
  where: {
    periodId: number;
  };
  select: {
    netPay: true;
  };
};

type StaffPayrollForPrefillFindManyArgs = {
  where: {
    periodId: number;
  };
  select: {
    id: true;
    staffId: true;
    allowances: true;
    deductions: true;
  };
};

type StaffPayrollForPrefillRow = {
  id: number;
  staffId: string;
  allowances: number;
  deductions: number;
};

type BudgetAmountRow = {
  month: number;
  amount: number;
};

type BudgetItemRow = {
  id: number;
  name: string;
  kind: BudgetItemKind;
  staffId: string | null;
  amounts: BudgetAmountRow[];
};

type BudgetYearWithSectionsRow = {
  id: number;
  academicYear: number;
  sections: Array<{
    items: BudgetItemRow[];
  }>;
};

type BudgetYearFindFirstArgs = {
  where: {
    academicYear: number;
    status: BudgetStatus;
    schoolId?: number | null;
  };
  include: {
    sections: {
      include: {
        items: {
          include: {
            amounts: true;
          };
        };
      };
    };
  };
};

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

type PrismaPayrollClient = {
  payrollPeriod: {
    create: (args: PayrollPeriodCreateArgs) => Promise<PayrollPeriodRow>;
    findFirst: (args: PayrollPeriodFindFirstArgs) => Promise<PayrollPeriodRow | null>;
    findUnique: (args: PayrollPeriodFindUniqueArgs) => Promise<{
      year: number;
      month: number;
      schoolId: number | null;
    } | null>;
    update: (args: PayrollPeriodUpdateArgs) => Promise<unknown>;
  };
  staff: {
    findMany: (args: StaffFindManyArgs) => Promise<StaffRow[]>;
  };
  staffPayroll: {
    create: (args: StaffPayrollCreateArgs) => Promise<unknown>;
    update: (args: StaffPayrollUpdateArgs) => Promise<unknown>;
    findMany: StaffPayrollFindMany;
  };
  expense: {
    create: (args: ExpenseCreateArgs) => Promise<unknown>;
  };
  budgetYear: {
    findFirst: (args: BudgetYearFindFirstArgs) => Promise<BudgetYearWithSectionsRow | null>;
  };
  $transaction: <T>(ops: ReadonlyArray<Promise<T>>) => Promise<Array<T>>;
};

const payrollPrisma = prisma as unknown as PrismaPayrollClient;

// Server action input types

export type CreatePayrollPeriodInput = {
  year: number;
  month: number;
};

export type UpdateStaffPayrollInput = {
  id: number;
  basicSalaryMinor: number;
  allowancesMinor: number;
  deductionsMinor: number;
  status?: PayrollStatus | undefined;
  notes?: string | undefined;
  // paymentMethod and paymentReference can be null in the DB; allow null and undefined here
  paymentMethod?: PaymentMethod | null | undefined;
  paymentReference?: string | null | undefined;
  paidAt?: string | null | undefined; // ISO date string
};

export type ClosePayrollPeriodInput = {
  periodId: number;
  createExpense: boolean;
};

export type PrefillPayrollFromBudgetInput = {
  periodId: number;
};

export const createPayrollPeriod = async (
  _state: { success: boolean; error: boolean },
  data: CreatePayrollPeriodInput,
) => {
  try {
    await ensurePermission(["payroll.write"]);

    const { schoolId } = await getCurrentSchoolContext();

    if (schoolId === null) {
      return { success: false, error: true } as const;
    }

    const existing = await payrollPrisma.payrollPeriod.findFirst({
      where: {
        year: data.year,
        month: data.month,
        schoolId,
      },
    });

    if (existing) {
      return { success: false, error: true } as const;
    }

    const created = await payrollPrisma.payrollPeriod.create({
      data: {
        year: data.year,
        month: data.month,
        status: "OPEN",
        schoolId,
      },
    });

    const staffList = await payrollPrisma.staff.findMany({
      where: { active: true },
      select: {
        id: true,
        role: true,
        basicSalary: true,
      },
    });

    if (staffList.length > 0) {
      const ops = staffList.map((s) =>
        payrollPrisma.staffPayroll.create({
          data: {
            periodId: created.id,
            staffId: s.id,
            staffRole: s.role,
            basicSalary: s.basicSalary,
            allowances: 0,
            deductions: 0,
            netPay: s.basicSalary,
            status: "DRAFT",
          },
        }),
      );

      await payrollPrisma.$transaction(ops);
    }

    revalidatePath("/finance/payroll");
    return { success: true, error: false } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: true } as const;
  }
};

export const updateStaffPayroll = async (
  _state: { success: boolean; error: boolean },
  data: UpdateStaffPayrollInput,
) => {
  try {
    await ensurePermission(["payroll.write"]);

    const netPay = Math.max(
      data.basicSalaryMinor + data.allowancesMinor - data.deductionsMinor,
      0,
    );

    const notesPatch =
      typeof data.notes === "string"
        ? { notes: data.notes }
        : {};

    const paymentMethodPatch =
      data.paymentMethod !== undefined
        ? { paymentMethod: data.paymentMethod }
        : {};

    const paymentReferencePatch =
      data.paymentReference !== undefined
        ? { paymentReference: data.paymentReference }
        : {};

    const paidAtPatch =
      typeof data.paidAt === "string"
        ? { paidAt: new Date(data.paidAt) }
        : {};

    const statusPatch =
      data.status !== undefined
        ? { status: data.status }
        : {};

    await payrollPrisma.staffPayroll.update({
      where: { id: data.id },
      data: {
        basicSalary: data.basicSalaryMinor,
        allowances: data.allowancesMinor,
        deductions: data.deductionsMinor,
        netPay,
        ...notesPatch,
        ...statusPatch,
        ...paymentMethodPatch,
        ...paymentReferencePatch,
        ...paidAtPatch,
      },
    });

    revalidatePath("/finance/payroll");
    return { success: true, error: false } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: true } as const;
  }
};

export const closePayrollPeriod = async (
  _state: { success: boolean; error: boolean },
  data: ClosePayrollPeriodInput,
) => {
  try {
    await ensurePermission(["payroll.write", "expenses.write"]);

    const [periodMeta, payrollRows] = await Promise.all([
      payrollPrisma.payrollPeriod.findUnique({
        where: { id: data.periodId },
        select: { year: true, month: true, schoolId: true },
      }),
      payrollPrisma.staffPayroll.findMany({
        where: { periodId: data.periodId },
        select: { netPay: true },
      }),
    ]);

    const totalNet = payrollRows.reduce(
      (sum, row) => sum + row.netPay,
      0,
    );

    const now = new Date();
    const ops: Array<Promise<unknown>> = [];

    ops.push(
      payrollPrisma.payrollPeriod.update({
        where: { id: data.periodId },
        data: {
          status: "PAID",
          closedAt: now,
        },
      }),
    );

    if (data.createExpense && totalNet > 0) {
      const titleBase = "Payroll";
      const title =
        periodMeta != null
          ? `${titleBase} ${periodMeta.year}-${String(periodMeta.month).padStart(2, "0")}`
          : titleBase;

      ops.push(
        payrollPrisma.expense.create({
          data: {
            title,
            amount: totalNet,
            category: "Payroll",
            date: now,
            schoolId: periodMeta?.schoolId ?? null,
          },
        }),
      );
    }

    if (ops.length > 0) {
      await payrollPrisma.$transaction(ops);
    }

    revalidatePath("/finance/payroll");
    return { success: true, error: false } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: true } as const;
  }
};

export const prefillPayrollFromBudget = async (
  _state: { success: boolean; error: boolean },
  data: PrefillPayrollFromBudgetInput,
) => {
  try {
    await ensurePermission(["payroll.write", "budget.read"]);

    const periodMeta = await payrollPrisma.payrollPeriod.findUnique({
      where: { id: data.periodId },
      select: { year: true, month: true, schoolId: true },
    });

    if (!periodMeta) {
      return { success: false, error: true } as const;
    }

    type BudgetAmountForPrefill = { month: number; amount: number };
    type BudgetItemForPrefill = {
      kind: BudgetItemKind;
      staffId: string | null;
      amounts: BudgetAmountForPrefill[];
    };
    type BudgetSectionForPrefill = { items: BudgetItemForPrefill[] };
    type BudgetYearForPrefill = { sections: BudgetSectionForPrefill[] };

    const budgetClient = payrollPrisma as unknown as {
      budgetYear: {
        findFirst: (args: BudgetYearFindFirstArgs) => Promise<BudgetYearForPrefill | null>;
      };
    };

    const budget = await budgetClient.budgetYear.findFirst({
      where: {
        academicYear: periodMeta.year,
        status: "APPROVED",
        schoolId: periodMeta.schoolId ?? null,
      },
      include: {
        sections: {
          include: {
            items: {
              include: {
                amounts: true,
              },
            },
          },
        },
      },
    });

    if (!budget) {
      return { success: false, error: true } as const;
    }

    const staffRows = await payrollPrisma.staffPayroll.findMany({
      where: { periodId: data.periodId },
      select: {
        id: true,
        staffId: true,
        allowances: true,
        deductions: true,
      },
    });

    if (staffRows.length === 0) {
      return { success: false, error: true } as const;
    }

    const staffBudgetItems = budget.sections
      .flatMap((section: BudgetSectionForPrefill) => section.items)
      .filter((item: BudgetItemForPrefill) => item.kind === "STAFF" && item.staffId !== null);

    if (staffBudgetItems.length === 0) {
      return { success: false, error: true } as const;
    }

    const month = periodMeta.month;
    const ops: Array<ReturnType<typeof payrollPrisma.staffPayroll.update>> = [];

    staffRows.forEach((row: StaffPayrollForPrefillRow) => {
      const budgetItem = staffBudgetItems.find(
        (item: BudgetItemForPrefill) => item.staffId === row.staffId,
      );
      if (!budgetItem) {
        return;
      }

      const amountForMonth = budgetItem.amounts.find(
        (amount: BudgetAmountForPrefill) => amount.month === month,
      );
      if (!amountForMonth || amountForMonth.amount <= 0) {
        return;
      }

      const newBasicSalary = amountForMonth.amount;
      const newNetPay = Math.max(newBasicSalary + row.allowances - row.deductions, 0);

      ops.push(
        payrollPrisma.staffPayroll.update({
          where: { id: row.id },
          data: {
            basicSalary: newBasicSalary,
            netPay: newNetPay,
          },
        }),
      );
    });

    if (ops.length === 0) {
      return { success: false, error: true } as const;
    }

    await Promise.all(ops);

    revalidatePath("/finance/payroll");
    return { success: true, error: false } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: true } as const;
  }
};
