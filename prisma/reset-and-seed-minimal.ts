import { PrismaClient, EducationStage, Term } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetAndSeedMinimal(): Promise<void> {
  console.log("⚠️ About to delete existing demo/test data and reseed minimal users.");
  console.log("   Only run this against a development database.\n");

  // Delete data in dependency-safe order (sequentially, to avoid long transactions)
  // CBC competency/SLO records depend on Student and Lesson
  await prisma.studentCompetencyRecord.deleteMany({});
  await prisma.studentSloRecord.deleteMany({});

  // Child tables first
  await prisma.attendance.deleteMany({});
  await prisma.result.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.exam.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.announcement.deleteMany({});

  // Finance / payments
  await prisma.mpesaTransaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.studentFee.deleteMany({});

  // Messaging / notifications
  await prisma.smsNotification.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.messageParticipant.deleteMany({});
  await prisma.messageThread.deleteMany({});

  // Budget & payroll
  await prisma.budgetAmount.deleteMany({});
  await prisma.budgetItem.deleteMany({});
  await prisma.budgetSection.deleteMany({});
  await prisma.budgetYear.deleteMany({});
  await prisma.staffPayroll.deleteMany({});
  await prisma.payrollPeriod.deleteMany({});

  // Fee metadata
  await prisma.classFeeStructure.deleteMany({});
  await prisma.feeCategory.deleteMany({});
  await prisma.feeStructure.deleteMany({});
  await prisma.schoolPaymentInfo.deleteMany({});

  // Core school data
  await prisma.student.deleteMany({});
  await prisma.parent.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.grade.deleteMany({});

  // Org-level
  await prisma.schoolUser.deleteMany({});
  await prisma.school.deleteMany({});
  await prisma.userPreference.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.accountant.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.schoolSettings.deleteMany({});

  console.log("✅ Existing data deleted.");
  console.log("🌱 Reseeding minimal test users and supporting data...\n");

  // Password hashes (keep credentials the same as today)
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const accountantPasswordHash = await bcrypt.hash("accountant123", 10);

  // Admins
  const admin1 = await prisma.admin.create({
    data: {
      username: "admin1",
      password: adminPasswordHash,
    },
  });

  const admin2 = await prisma.admin.create({
    data: {
      username: "admin2",
      password: adminPasswordHash,
    },
  });

  const admin3 = await prisma.admin.create({
    data: {
      username: "admin3",
      password: adminPasswordHash,
    },
  });

  const admin4 = await prisma.admin.create({
    data: {
      username: "admin4",
      password: adminPasswordHash,
    },
  });

  const admin5 = await prisma.admin.create({
    data: {
      username: "admin5",
      password: adminPasswordHash,
    },
  });

  const admin6 = await prisma.admin.create({
    data: {
      username: "admin6",
      password: adminPasswordHash,
    },
  });

  const admin7 = await prisma.admin.create({
    data: {
      username: "admin7",
      password: adminPasswordHash,
    },
  });

  const admin8 = await prisma.admin.create({
    data: {
      username: "admin8",
      password: adminPasswordHash,
    },
  });

  // Accountant
  const accountant1 = await prisma.accountant.create({
    data: {
      username: "accountant1",
      password: accountantPasswordHash,
    },
  });

  const accountant2 = await prisma.accountant.create({
    data: {
      username: "accountant2",
      password: accountantPasswordHash,
    },
  });

  // Two schools
  const school1 = await prisma.school.create({
    data: {
      name: "Test School 1",
      code: "TEST-001",
      active: true,
    },
  });

  const school2 = await prisma.school.create({
    data: {
      name: "Test School 2",
      code: "TEST-002",
      active: true,
    },
  });

  const school3 = await prisma.school.create({
    data: {
      name: "Test School 3",
      code: "TEST-003",
      active: true,
    },
  });

  const currentYear = new Date().getFullYear();

  await prisma.schoolSettings.create({
    data: {
      id: 1,
      schoolName: "Test Schools",
      currentAcademicYear: currentYear,
      currentTerm: Term.TERM1,
      passingScore: 50,
    },
  });

  // Minimal academic structure: grades + one class
  const canonicalGrades: Array<{ level: number; stage: EducationStage }> = [
    { level: 1, stage: EducationStage.PRE_PRIMARY },
    { level: 2, stage: EducationStage.PRE_PRIMARY },
    { level: 3, stage: EducationStage.LOWER_PRIMARY },
    { level: 4, stage: EducationStage.LOWER_PRIMARY },
    { level: 5, stage: EducationStage.LOWER_PRIMARY },
    { level: 6, stage: EducationStage.UPPER_PRIMARY },
    { level: 7, stage: EducationStage.UPPER_PRIMARY },
    { level: 8, stage: EducationStage.UPPER_PRIMARY },
    { level: 9, stage: EducationStage.JUNIOR_SECONDARY },
    { level: 10, stage: EducationStage.JUNIOR_SECONDARY },
    { level: 11, stage: EducationStage.JUNIOR_SECONDARY },
  ];

  await Promise.all(
    canonicalGrades.map((gradeRow) =>
      prisma.grade.create({
        data: {
          level: gradeRow.level,
          stage: gradeRow.stage,
        },
      }),
    ),
  );

  const grade = await prisma.grade.findUnique({ where: { level: 3 } });

  if (!grade) {
    throw new Error("Grade with level 3 (Grade 1) not found after seeding.");
  }

  const class1 = await prisma.class.create({
    data: {
      name: "1A",
      capacity: 30,
      gradeId: grade.id,
      schoolId: school1.id,
    },
  });

  const class2 = await prisma.class.create({
    data: {
      name: "1B",
      capacity: 30,
      gradeId: grade.id,
      schoolId: school2.id,
    },
  });

  // School memberships (for SUPER_ADMIN and normal admins/accountant)
  await prisma.schoolUser.createMany({
    data: [
      {
        schoolId: school1.id,
        userId: admin1.id,
        role: "SUPER_ADMIN",
      },
      {
        schoolId: school1.id,
        userId: admin2.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: school2.id,
        userId: admin3.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: school1.id,
        userId: admin4.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: school2.id,
        userId: admin5.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: school1.id,
        userId: admin6.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: school2.id,
        userId: admin7.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: school3.id,
        userId: admin8.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: school1.id,
        userId: accountant1.id,
        role: "ACCOUNTANT",
      },
      {
        schoolId: school2.id,
        userId: accountant2.id,
        role: "ACCOUNTANT",
      },
    ],
  });

  console.log("✅ Minimal seed complete. Test logins:");
  console.log("   Admin (SUPER_ADMIN): admin1 / admin123");
  console.log("   Admins:              admin2..admin8 / admin123");
  console.log("   Accountants:         accountant1..accountant2 / accountant123");
  console.log("");

}

resetAndSeedMinimal()
  .catch(async (error: unknown) => {
    console.error("❌ Error during reset-and-seed:", error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .then(async () => {
    await prisma.$disconnect();
  });
