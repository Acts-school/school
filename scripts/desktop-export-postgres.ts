import { PrismaClient } from "../prisma/client";

const EXPORT_PATH = "desktop-snapshot.json" as const;

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Minimal initial subset; can be extended safely.
  const [schools, grades, classes, subjects, staff, parents, teachers, students, studentParents, feeCategories, feeStructures, classFeeStructures, invoices, studentFees, payments, allocations, mpesaTransactions, lessons, exams, assignments, results, attendance] = await Promise.all([
    prisma.school.findMany(),
    prisma.grade.findMany(),
    prisma.class.findMany(),
    prisma.subject.findMany(),
    prisma.staff.findMany(),
    prisma.parent.findMany(),
    prisma.teacher.findMany(),
    prisma.student.findMany(),
    prisma.studentParent.findMany(),
    prisma.feeCategory.findMany(),
    prisma.feeStructure.findMany(),
    prisma.classFeeStructure.findMany(),
    prisma.invoice.findMany(),
    prisma.studentFee.findMany(),
    prisma.payment.findMany(),
    prisma.studentFeePaymentAllocation.findMany(),
    prisma.mpesaTransaction.findMany(),
    prisma.lesson.findMany(),
    prisma.exam.findMany(),
    prisma.assignment.findMany(),
    prisma.result.findMany(),
    prisma.attendance.findMany(),
  ]);

  const snapshot = {
    schools,
    grades,
    classes,
    subjects,
    staff,
    parents,
    teachers,
    students,
    studentParents,
    feeCategories,
    feeStructures,
    classFeeStructures,
    invoices,
    studentFees,
    payments,
    allocations,
    mpesaTransactions,
    lessons,
    exams,
    assignments,
    results,
    attendance,
  } as const;

  const fs = await import("node:fs/promises");
  await fs.writeFile(EXPORT_PATH, JSON.stringify(snapshot), { encoding: "utf8" });

  // eslint-disable-next-line no-console
  console.log(`Exported Postgres snapshot to ${EXPORT_PATH}`);
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Postgres export failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
