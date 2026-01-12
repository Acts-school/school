import { PrismaClient, EducationStage, Term } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedDev(): Promise<void> {
  console.log("⚠️ Clearing existing data (development only)...");

  // Delete in dependency-safe order
  await prisma.studentCompetencyRecord.deleteMany({});
  await prisma.studentSloRecord.deleteMany({});

  await prisma.attendance.deleteMany({});
  await prisma.result.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.exam.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.announcement.deleteMany({});

  await prisma.mpesaTransaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.studentFee.deleteMany({});

  await prisma.smsNotification.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.messageParticipant.deleteMany({});
  await prisma.messageThread.deleteMany({});

  await prisma.budgetAmount.deleteMany({});
  await prisma.budgetItem.deleteMany({});
  await prisma.budgetSection.deleteMany({});
  await prisma.budgetYear.deleteMany({});
  await prisma.staffPayroll.deleteMany({});
  await prisma.payrollPeriod.deleteMany({});
  await prisma.expense.deleteMany({});

  await prisma.classFeeStructure.deleteMany({});
  await prisma.feeCategory.deleteMany({});
  await prisma.feeStructure.deleteMany({});
  await prisma.schoolPaymentInfo.deleteMany({});

  await prisma.student.deleteMany({});
  await prisma.parent.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.grade.deleteMany({});

  await prisma.schoolUser.deleteMany({});
  await prisma.school.deleteMany({});
  await prisma.userPreference.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.accountant.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.schoolSettings.deleteMany({});

  console.log("✅ Existing data cleared.");
  console.log("🌱 Seeding new development data (1 super admin, 2 school admins, grades, and classes)...\n");

  // Password hashes
  const adminPasswordHash = await bcrypt.hash("admin123", 10);

  // Admins
  const superAdmin = await prisma.admin.create({
    data: {
      username: "superadmin",
      password: adminPasswordHash,
    },
  });

  const schoolAdmin1 = await prisma.admin.create({
    data: {
      username: "admin_school1",
      password: adminPasswordHash,
    },
  });

  const schoolAdmin2 = await prisma.admin.create({
    data: {
      username: "admin_school2",
      password: adminPasswordHash,
    },
  });

  // Schools
  const school1 = await prisma.school.create({
    data: {
      name: "Demo School 1",
      code: "DEMO-001",
      active: true,
    },
  });

  const school2 = await prisma.school.create({
    data: {
      name: "Demo School 2",
      code: "DEMO-002",
      active: true,
    },
  });

  const currentYear = new Date().getFullYear();

  await prisma.schoolSettings.create({
    data: {
      id: 1,
      schoolName: "Demo Schools",
      currentAcademicYear: currentYear,
      currentTerm: Term.TERM1,
      passingScore: 50,
    },
  });

  // Grade & Classes
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
    canonicalGrades.map((grade) =>
      prisma.grade.create({
        data: {
          level: grade.level,
          stage: grade.stage,
        },
      }),
    ),
  );

  const grade1 = await prisma.grade.findUnique({ where: { level: 3 } });

  if (!grade1) {
    throw new Error("Grade with level 3 (Grade 1) not found after seeding.");
  }

  await prisma.class.create({
    data: {
      name: "1A",
      capacity: 30,
      gradeId: grade1.id,
      schoolId: school1.id,
    },
  });

  await prisma.class.create({
    data: {
      name: "1B",
      capacity: 30,
      gradeId: grade1.id,
      schoolId: school2.id,
    },
  });

  // School memberships (admins)
  await prisma.schoolUser.createMany({
    data: [
      {
        schoolId: school1.id,
        userId: superAdmin.id,
        role: "SUPER_ADMIN",
      },
      {
        schoolId: school1.id,
        userId: schoolAdmin1.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: school2.id,
        userId: schoolAdmin2.id,
        role: "SCHOOL_ADMIN",
      },
    ],
  });

  console.log("✅ Dev seed complete. Test logins:");
  console.log("   Super admin:       superadmin / admin123");
  console.log("   School admins:     admin_school1, admin_school2 / admin123\n");
}

seedDev()
  .catch(async (error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("❌ Error during dev seed:", error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .then(async () => {
    await prisma.$disconnect();
  });
