import { PrismaClient as PostgresPrismaClient } from "../prisma/client-postgres";
import { PrismaClient as SqlitePrismaClient } from "../prisma/client-sqlite";

const POSTGRES_URL_ENV_KEYS = ["DESKTOP_IMPORT_POSTGRES_URL", "DATABASE_URL"] as const;
const SQLITE_URL_ENV_KEYS = ["DESKTOP_IMPORT_SQLITE_URL"] as const;

function requireEnvUrl(keys: readonly string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  throw new Error(`Missing required database URL. Tried env keys: ${keys.join(", ")}`);
}

async function main(): Promise<void> {
  const postgresUrl = requireEnvUrl(POSTGRES_URL_ENV_KEYS);
  const sqliteUrl = requireEnvUrl(SQLITE_URL_ENV_KEYS);

  const postgres = new PostgresPrismaClient({
    datasources: {
      db: { url: postgresUrl },
    },
  });

  const sqlite = new SqlitePrismaClient({
    datasources: {
      db: { url: sqliteUrl },
    },
  });

  try {
    // Example minimal import set. This can be extended incrementally.
    // Order is chosen to satisfy foreign key dependencies.

    // 1. Schools and grades
    const schools = await postgres.school.findMany();
    await sqlite.school.createMany({ data: schools, skipDuplicates: true });

    const grades = await postgres.grade.findMany();
    await sqlite.grade.createMany({ data: grades, skipDuplicates: true });

    // 2. Classes and subjects
    const classes = await postgres.class.findMany();
    await sqlite.class.createMany({ data: classes, skipDuplicates: true });

    const subjects = await postgres.subject.findMany();
    await sqlite.subject.createMany({ data: subjects, skipDuplicates: true });

    // 3. Staff and users (parents, teachers, students)
    const staff = await postgres.staff.findMany();
    await sqlite.staff.createMany({ data: staff, skipDuplicates: true });

    const parents = await postgres.parent.findMany();
    await sqlite.parent.createMany({ data: parents, skipDuplicates: true });

    const teachers = await postgres.teacher.findMany();
    await sqlite.teacher.createMany({ data: teachers, skipDuplicates: true });

    const students = await postgres.student.findMany();
    await sqlite.student.createMany({ data: students, skipDuplicates: true });

    const studentParents = await postgres.studentParent.findMany();
    await sqlite.studentParent.createMany({ data: studentParents, skipDuplicates: true });

    // 4. Core finance entities
    const feeCategories = await postgres.feeCategory.findMany();
    await sqlite.feeCategory.createMany({ data: feeCategories, skipDuplicates: true });

    const feeStructures = await postgres.feeStructure.findMany();
    await sqlite.feeStructure.createMany({ data: feeStructures, skipDuplicates: true });

    const classFeeStructures = await postgres.classFeeStructure.findMany();
    await sqlite.classFeeStructure.createMany({ data: classFeeStructures, skipDuplicates: true });

    const invoices = await postgres.invoice.findMany();
    await sqlite.invoice.createMany({ data: invoices, skipDuplicates: true });

    const studentFees = await postgres.studentFee.findMany();
    await sqlite.studentFee.createMany({ data: studentFees, skipDuplicates: true });

    const payments = await postgres.payment.findMany();
    await sqlite.payment.createMany({ data: payments, skipDuplicates: true });

    const allocations = await postgres.studentFeePaymentAllocation.findMany();
    await sqlite.studentFeePaymentAllocation.createMany({ data: allocations, skipDuplicates: true });

    const mpesaTransactions = await postgres.mpesaTransaction.findMany();
    await sqlite.mpesaTransaction.createMany({ data: mpesaTransactions, skipDuplicates: true });

    // 5. Minimal attendance and exams/result data
    const lessons = await postgres.lesson.findMany();
    await sqlite.lesson.createMany({ data: lessons, skipDuplicates: true });

    const exams = await postgres.exam.findMany();
    await sqlite.exam.createMany({ data: exams, skipDuplicates: true });

    const assignments = await postgres.assignment.findMany();
    await sqlite.assignment.createMany({ data: assignments, skipDuplicates: true });

    const results = await postgres.result.findMany();
    await sqlite.result.createMany({ data: results, skipDuplicates: true });

    const attendance = await postgres.attendance.findMany();
    await sqlite.attendance.createMany({ data: attendance, skipDuplicates: true });

    // 6. Mark initial import complete in a simple meta table if it exists.
    // If you later add a dedicated Meta model, this is where you would write to it.

    // eslint-disable-next-line no-console
    console.log("Postgres → SQLite import completed successfully.");
  } finally {
    await Promise.allSettled([
      postgres.$disconnect(),
      sqlite.$disconnect(),
    ]);
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Postgres → SQLite import failed:", error);
  process.exitCode = 1;
});
