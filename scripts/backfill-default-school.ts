import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type DefaultSchoolRow = {
  id: number;
};

type SchoolUserRow = {
  id: number;
};

type BackfillPrisma = {
  school: {
    findFirst: (args: {
      where: { code: string };
      select: { id: true };
    }) => Promise<DefaultSchoolRow | null>;
    create: (args: {
      data: { name: string; code: string; active: boolean };
      select: { id: true };
    }) => Promise<DefaultSchoolRow>;
  };
  schoolUser: {
    findFirst: (args: {
      where: { schoolId: number; userId: string };
      select: { id: true };
    }) => Promise<SchoolUserRow | null>;
    create: (args: {
      data: { schoolId: number; userId: string; role: string };
      select: { id: true };
    }) => Promise<SchoolUserRow>;
  };
  class: {
    updateMany: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<{ count: number }>;
  };
  expense: {
    updateMany: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<{ count: number }>;
  };
  budgetYear: {
    updateMany: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<{ count: number }>;
  };
  payrollPeriod: {
    updateMany: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<{ count: number }>;
  };
};

const backfillPrisma = prisma as unknown as BackfillPrisma;

const DEFAULT_SCHOOL_NAME = process.env.DEFAULT_SCHOOL_NAME ?? "Main Campus";
const DEFAULT_SCHOOL_CODE = process.env.DEFAULT_SCHOOL_CODE ?? "MAIN";
const DEFAULT_SUPER_ADMIN_USER_ID = process.env.DEFAULT_SUPER_ADMIN_USER_ID;

const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(message);
};

async function ensureDefaultSchool(): Promise<{ id: number }> {
  const existing = await backfillPrisma.school.findFirst({
    where: { code: DEFAULT_SCHOOL_CODE },
    select: { id: true },
  });

  if (existing) {
    log(`Using existing default school with id=${existing.id} (code=${DEFAULT_SCHOOL_CODE}).`);
    return existing;
  }

  const created = await backfillPrisma.school.create({
    data: {
      name: DEFAULT_SCHOOL_NAME,
      code: DEFAULT_SCHOOL_CODE,
      active: true,
    },
    select: { id: true },
  });

  log(`Created default school with id=${created.id} (code=${DEFAULT_SCHOOL_CODE}).`);
  return created;
}

async function ensureSuperAdminMembership(schoolId: number): Promise<void> {
  if (!DEFAULT_SUPER_ADMIN_USER_ID) {
    log("DEFAULT_SUPER_ADMIN_USER_ID not set; skipping SUPER_ADMIN membership creation.");
    return;
  }

  const existing = await backfillPrisma.schoolUser.findFirst({
    where: {
      schoolId,
      userId: DEFAULT_SUPER_ADMIN_USER_ID,
    },
    select: { id: true },
  });

  if (existing) {
    log(
      `SUPER_ADMIN membership already exists for userId=${DEFAULT_SUPER_ADMIN_USER_ID} in schoolId=${schoolId} (membership id=${existing.id}).`,
    );
    return;
  }

  const created = await backfillPrisma.schoolUser.create({
    data: {
      schoolId,
      userId: DEFAULT_SUPER_ADMIN_USER_ID,
      role: "SUPER_ADMIN",
    },
    select: { id: true },
  });

  log(
    `Created SUPER_ADMIN membership (id=${created.id}) for userId=${DEFAULT_SUPER_ADMIN_USER_ID} in schoolId=${schoolId}.`,
  );
}

async function backfillClassSchoolId(schoolId: number): Promise<number> {
  const result = await backfillPrisma.class.updateMany({
    where: { schoolId: null } as Record<string, unknown>,
    data: { schoolId } as Record<string, unknown>,
  });

  const count = result.count ?? 0;
  log(`Backfilled schoolId on ${count} class(es).`);
  return count;
}

async function backfillExpenseSchoolId(schoolId: number): Promise<number> {
  const result = await backfillPrisma.expense.updateMany({
    where: { schoolId: null } as Record<string, unknown>,
    data: { schoolId } as Record<string, unknown>,
  });

  const count = result.count ?? 0;
  log(`Backfilled schoolId on ${count} expense(s).`);
  return count;
}

async function backfillBudgetYearSchoolId(schoolId: number): Promise<number> {
  const result = await backfillPrisma.budgetYear.updateMany({
    where: { schoolId: null } as Record<string, unknown>,
    data: { schoolId } as Record<string, unknown>,
  });

  const count = result.count ?? 0;
  log(`Backfilled schoolId on ${count} budget year(s).`);
  return count;
}

async function backfillPayrollPeriodSchoolId(schoolId: number): Promise<number> {
  const result = await backfillPrisma.payrollPeriod.updateMany({
    where: { schoolId: null } as Record<string, unknown>,
    data: { schoolId } as Record<string, unknown>,
  });

  const count = result.count ?? 0;
  log(`Backfilled schoolId on ${count} payroll period(s).`);
  return count;
}

async function main(): Promise<void> {
  log("Starting default school backfill...");
  log(`DEFAULT_SCHOOL_NAME=${DEFAULT_SCHOOL_NAME}`);
  log(`DEFAULT_SCHOOL_CODE=${DEFAULT_SCHOOL_CODE}`);

  const school = await ensureDefaultSchool();

  await ensureSuperAdminMembership(school.id);

  await backfillClassSchoolId(school.id);
  await backfillExpenseSchoolId(school.id);
  await backfillBudgetYearSchoolId(school.id);
  await backfillPayrollPeriodSchoolId(school.id);

  log("Backfill completed.");
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
