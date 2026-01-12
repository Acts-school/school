import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Narrow Prisma facades (so we can compile before prisma generate)
type FeeCategoryUpsertArgs = {
  where: { name: string };
  update: { description?: string; frequency: "TERMLY" | "YEARLY" | "ONE_TIME"; isRecurring: boolean; active: boolean };
  create: { name: string; description?: string; frequency: "TERMLY" | "YEARLY" | "ONE_TIME"; isRecurring: boolean; active: boolean; isEditable: boolean };
};
type FeeCategoryFindManyArgs = { where?: { name?: { in?: string[] } } };
type FeeCategoryRow = { id: number; name: string };

type SchoolPaymentInfoUpsertArgs = { where: { name: string }; update: { data: unknown }; create: { name: string; data: unknown } };

type GradeUpsertArgs = { where: { level: number }; update: Record<string, never>; create: { level: number } };
type GradeRow = { id: number };

type ClassUpsertArgs = { where: { name: string }; update: Record<string, never>; create: { name: string; capacity: number; gradeId: number } };
type ClassFindUniqueArgs = { where: { name: string } };
type ClassRow = { id: number } | null;
type ClassFindManyArgs = { where: { name: { in: string[] } } };

type ClassFeeStructureUpsertArgs = {
  where: { classId_feeCategoryId_term_academicYear: { classId: number; feeCategoryId: number; term: "TERM1" | "TERM2" | "TERM3" | null; academicYear: number } };
  update: { amount: number; active: boolean };
  create: { classId: number; feeCategoryId: number; term: "TERM1" | "TERM2" | "TERM3" | null; academicYear: number; amount: number; active: boolean };
};

type FeePrisma = {
  feeCategory: {
    upsert: (args: FeeCategoryUpsertArgs) => Promise<unknown>;
    findMany: (args: FeeCategoryFindManyArgs) => Promise<FeeCategoryRow[]>;
  };
  schoolPaymentInfo: { upsert: (args: SchoolPaymentInfoUpsertArgs) => Promise<unknown> };
  grade: { upsert: (args: GradeUpsertArgs) => Promise<GradeRow> };
  class: { upsert: (args: ClassUpsertArgs) => Promise<unknown>; findUnique: (args: ClassFindUniqueArgs) => Promise<ClassRow>; findMany: (args: ClassFindManyArgs) => Promise<Array<{ id: number; name: string }>> };
  classFeeStructure: { upsert: (args: ClassFeeStructureUpsertArgs) => Promise<unknown> };
};

const feePrisma = prisma as unknown as FeePrisma;

const minor = (kes: number): number => Math.round(kes * 100);

async function ensureFeeCategory(
  name: string,
  frequency: "TERMLY" | "YEARLY" | "ONE_TIME",
  isRecurring: boolean,
  description?: string,
) {
  await feePrisma.feeCategory.upsert({
    where: { name },
    update: { ...(description !== undefined ? { description } : {}), frequency, isRecurring, active: true },
    create: { name, ...(description !== undefined ? { description } : {}), frequency, isRecurring, active: true, isEditable: true },
  });
}

async function ensureClassFeeStructurePrimary(year: number) {
  // Classes created by existing seed: "1A".."6A"
  const classNames: ReadonlyArray<string> = ["1A", "2A", "3A", "4A", "5A", "6A"];
  const classes = await feePrisma.class.findMany({ where: { name: { in: classNames.slice() } } });
  if (classes.length === 0) return;

  const categories = await feePrisma.feeCategory.findMany({
    where: {
      name: { in: ["Tuition", "External Exams", "Meals", "Computer Studies", "Activity", "Assessment Book", "Term Adjustment"] },
    },
  });
  const byName: Map<string, FeeCategoryRow> = new Map(categories.map((cat) => [cat.name, cat]));

  // Ensure we have Term Adjustment category (TERMLY) in case not created yet
  if (!byName.has("Term Adjustment")) {
    await ensureFeeCategory("Term Adjustment", "TERMLY", true, "Balancing line to match authoritative totals");
    const refreshed = await feePrisma.feeCategory.findMany({ where: { name: { in: ["Term Adjustment"] } } });
    if (refreshed.length > 0) byName.set(refreshed[0]!.name, refreshed[0]!);
  }

  for (const cls of classes) {
    // Term 1 items to hit 9,900 (including Computer Studies):
    // Tuition 5000, External 300, Meals 1800, Computer 1500, Activity 700 (yearly, term=null), Assessment Book 400 (TERM1), Term Adjustment 200 (TERM1)
    const term1Lines: ReadonlyArray<{ name: string; term: "TERM1" | null; amountKes: number }> = [
      { name: "Tuition", term: "TERM1", amountKes: 5000 },
      { name: "External Exams", term: "TERM1", amountKes: 300 },
      { name: "Meals", term: "TERM1", amountKes: 1800 },
      { name: "Computer Studies", term: "TERM1", amountKes: 1500 },
      { name: "Activity", term: null, amountKes: 700 },
      { name: "Assessment Book", term: "TERM1", amountKes: 400 },
      { name: "Term Adjustment", term: "TERM1", amountKes: 200 },
    ];

    const term2Lines: ReadonlyArray<{ name: string; term: "TERM2"; amountKes: number }> = [
      { name: "Tuition", term: "TERM2", amountKes: 5000 },
      { name: "External Exams", term: "TERM2", amountKes: 300 },
      { name: "Meals", term: "TERM2", amountKes: 1800 },
      { name: "Computer Studies", term: "TERM2", amountKes: 1500 },
      { name: "Term Adjustment", term: "TERM2", amountKes: 200 },
    ];

    const term3Lines: ReadonlyArray<{ name: string; term: "TERM3"; amountKes: number }> = [
      { name: "Tuition", term: "TERM3", amountKes: 5000 },
      { name: "External Exams", term: "TERM3", amountKes: 300 },
      { name: "Meals", term: "TERM3", amountKes: 1800 },
      { name: "Computer Studies", term: "TERM3", amountKes: 1500 },
      { name: "Term Adjustment", term: "TERM3", amountKes: 200 },
    ];

    const all: ReadonlyArray<{ name: string; term: "TERM1" | "TERM2" | "TERM3" | null; amount: number }> = [
      ...term1Lines.map((l) => ({ name: l.name, term: l.term, amount: minor(l.amountKes) })),
      ...term2Lines.map((l) => ({ name: l.name, term: l.term, amount: minor(l.amountKes) })),
      ...term3Lines.map((l) => ({ name: l.name, term: l.term, amount: minor(l.amountKes) })),
    ];

    for (const l of all) {
      const cat = byName.get(l.name);
      if (!cat) continue;
      await feePrisma.classFeeStructure.upsert({
        where: { classId_feeCategoryId_term_academicYear: { classId: cls.id, feeCategoryId: cat.id, term: l.term, academicYear: year } },
        update: { amount: l.amount, active: true },
        create: { classId: cls.id, feeCategoryId: cat.id, term: l.term, academicYear: year, amount: l.amount, active: true },
      });
    }
  }
}

async function ensureSchoolPaymentInfo() {
  const entries: Array<{ name: string; data: unknown }> = [
    { name: "Kingdom Bank", data: { paybill: 529914, account: "51029" } },
    { name: "M-Pesa", data: { till: 5669463 } },
    { name: "Computer Studies PayBill", data: { paybill: 400200, account: "01109613617800" } },
    { name: "One-time", data: { admission: 2500, interview: 500 } },
  ];
  for (const e of entries) {
    await feePrisma.schoolPaymentInfo.upsert({ where: { name: e.name }, update: { data: e.data }, create: { name: e.name, data: e.data } });
  }
}

async function ensureGradeAndClassECDE() {
  const ecde = await feePrisma.grade.upsert({ where: { level: 0 }, update: {}, create: { level: 0 } });
  await feePrisma.class.upsert({ where: { name: "ECDE" }, update: {}, create: { name: "ECDE", capacity: 30, gradeId: ecde.id } });
}

async function ensureClassFeeStructureECDE(year: number) {
  const cls = await feePrisma.class.findUnique({ where: { name: "ECDE" } });
  if (!cls) return;

  const categories = await feePrisma.feeCategory.findMany({ where: { name: { in: ["Tuition", "External Exams", "Meals", "Activity", "Assessment Book"] } } });
  const byName: Map<string, FeeCategoryRow> = new Map(categories.map((cat) => [cat.name, cat]));

  const lines: ReadonlyArray<{ feeCategoryName: string; term: "TERM1" | "TERM2" | "TERM3" | null; amount: number }> = [
    { feeCategoryName: "Tuition", term: "TERM1", amount: minor(4000) },
    { feeCategoryName: "Tuition", term: "TERM2", amount: minor(4000) },
    { feeCategoryName: "Tuition", term: "TERM3", amount: minor(4000) },
    { feeCategoryName: "External Exams", term: "TERM1", amount: minor(300) },
    { feeCategoryName: "External Exams", term: "TERM2", amount: minor(300) },
    { feeCategoryName: "External Exams", term: "TERM3", amount: minor(300) },
    { feeCategoryName: "Meals", term: "TERM1", amount: minor(1800) },
    { feeCategoryName: "Meals", term: "TERM2", amount: minor(1800) },
    { feeCategoryName: "Meals", term: "TERM3", amount: minor(1800) },
    // yearly activity stored once per year (term null)
    { feeCategoryName: "Activity", term: null, amount: minor(700) },
    // one-time assessment book shown under TERM1
    { feeCategoryName: "Assessment Book", term: "TERM1", amount: minor(400) },
  ];

  for (const l of lines) {
    const cat = byName.get(l.feeCategoryName);
    if (!cat) continue;
    await feePrisma.classFeeStructure.upsert({
      where: { classId_feeCategoryId_term_academicYear: { classId: cls.id, feeCategoryId: cat.id, term: l.term, academicYear: year } },
      update: { amount: l.amount, active: true },
      create: { classId: cls.id, feeCategoryId: cat.id, term: l.term, academicYear: year, amount: l.amount, active: true },
    });
  }
}

export async function seedFees(): Promise<void> {
  await ensureFeeCategory("Tuition", "TERMLY", true);
  await ensureFeeCategory("External Exams", "TERMLY", true);
  await ensureFeeCategory("Meals", "TERMLY", true);
  await ensureFeeCategory("Computer Studies", "TERMLY", true);
  await ensureFeeCategory("Activity", "YEARLY", true);
  await ensureFeeCategory("Assessment Book", "ONE_TIME", false);
  await ensureFeeCategory("Admission", "ONE_TIME", false);
  await ensureFeeCategory("Interview", "ONE_TIME", false);
  await ensureFeeCategory("Transport", "TERMLY", true);
  await ensureFeeCategory("Uniform", "ONE_TIME", false);

  await ensureSchoolPaymentInfo();
  await ensureGradeAndClassECDE();
  await ensureClassFeeStructureECDE(2025);
  await ensureClassFeeStructurePrimary(2025);
}
