import { PrismaClient, EducationStage, Term, InvoiceStatus, PaymentMethod, UserSex } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedFees } from "./seed-fees";

const prisma = new PrismaClient();

async function seedDev(): Promise<void> {
  console.log("⚠️ Clearing existing data (development only)...");

  // Delete in dependency-safe order
  await prisma.studentCompetencyRecord.deleteMany({});
  await prisma.studentSloRecord.deleteMany({});
  await prisma.learningObservation.deleteMany({});

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

  await prisma.studentParent.deleteMany({});
  await prisma.studentPhoneAlias.deleteMany({});
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

  const school1Admin1 = await prisma.admin.create({
    data: {
      username: "admin_school1_a",
      password: adminPasswordHash,
    },
  });

  const school1Admin2 = await prisma.admin.create({
    data: {
      username: "admin_school1_b",
      password: adminPasswordHash,
    },
  });

  const school2Admin1 = await prisma.admin.create({
    data: {
      username: "admin_school2_a",
      password: adminPasswordHash,
    },
  });

  const school2Admin2 = await prisma.admin.create({
    data: {
      username: "admin_school2_b",
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

  const grades = await prisma.grade.findMany();
  const gradeByLevel = new Map<number, (typeof grades)[number]>(grades.map((grade) => [grade.level, grade]));

  const classDefinitions: Array<{ name: string; gradeLevel: number; schoolId: number }> = [
    { name: "1A", gradeLevel: 3, schoolId: school1.id },
    { name: "1B", gradeLevel: 3, schoolId: school2.id },
    { name: "2A", gradeLevel: 4, schoolId: school1.id },
    { name: "2B", gradeLevel: 4, schoolId: school2.id },
    { name: "3A", gradeLevel: 5, schoolId: school1.id },
    { name: "3B", gradeLevel: 5, schoolId: school2.id },
    { name: "4A", gradeLevel: 6, schoolId: school1.id },
    { name: "4B", gradeLevel: 6, schoolId: school2.id },
    { name: "5A", gradeLevel: 7, schoolId: school1.id },
    { name: "5B", gradeLevel: 7, schoolId: school2.id },
    { name: "6A", gradeLevel: 8, schoolId: school1.id },
    { name: "6B", gradeLevel: 8, schoolId: school2.id },
  ];

  const classes = [] as Array<{ id: number; name: string; gradeLevel: number; schoolId: number }>;

  for (const classDef of classDefinitions) {
    const grade = gradeByLevel.get(classDef.gradeLevel);

    if (!grade) {
      throw new Error(`Grade with level ${classDef.gradeLevel} not found after seeding.`);
    }

    const createdClass = await prisma.class.create({
      data: {
        name: classDef.name,
        capacity: 30,
        gradeId: grade.id,
        schoolId: classDef.schoolId,
      },
    });

    classes.push({ id: createdClass.id, name: classDef.name, gradeLevel: classDef.gradeLevel, schoolId: classDef.schoolId });
  }

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
        userId: school1Admin1.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: school1.id,
        userId: school1Admin2.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: school2.id,
        userId: school2Admin1.id,
        role: "SCHOOL_ADMIN",
      },
      {
        schoolId: school2.id,
        userId: school2Admin2.id,
        role: "SCHOOL_ADMIN",
      },
    ],
  });

  await seedFees(currentYear);

  // Demo subjects
  const subjects = await Promise.all([
    prisma.subject.create({ data: { name: "Mathematics" } }),
    prisma.subject.create({ data: { name: "Science" } }),
    prisma.subject.create({ data: { name: "English" } }),
    prisma.subject.create({ data: { name: "History" } }),
    prisma.subject.create({ data: { name: "Geography" } }),
  ]);

  // Demo teachers
  const teacherPasswordHash = await bcrypt.hash("teacher123", 10);

  const teacher1 = await prisma.teacher.create({
    data: {
      username: "teacher_joy",
      password: teacherPasswordHash,
      name: "Joy",
      surname: "Kamau",
      address: "Nairobi",
      bloodType: "O+",
      sex: UserSex.FEMALE,
      birthday: new Date("1990-05-10"),
    },
  });

  const teacher2 = await prisma.teacher.create({
    data: {
      username: "teacher_peter",
      password: teacherPasswordHash,
      name: "Peter",
      surname: "Otieno",
      address: "Nairobi",
      bloodType: "A+",
      sex: UserSex.MALE,
      birthday: new Date("1988-09-15"),
    },
  });

  // Link teachers to subjects
  await prisma.subject.update({
    where: { id: subjects[0]!.id },
    data: {
      teachers: {
        connect: [{ id: teacher1.id }],
      },
    },
  });

  await prisma.subject.update({
    where: { id: subjects[2]!.id },
    data: {
      teachers: {
        connect: [{ id: teacher2.id }],
      },
    },
  });

  // Demo parents
  const parentPasswordHash = await bcrypt.hash("parent123", 10);

  const parent1 = await prisma.parent.create({
    data: {
      username: "parent_wanjiku",
      password: parentPasswordHash,
      name: "Mary",
      surname: "Wanjiku",
      phone: "0712000001",
      address: "Nairobi",
      schoolId: school1.id,
    },
  });

  const parent2 = await prisma.parent.create({
    data: {
      username: "parent_okello",
      password: parentPasswordHash,
      name: "James",
      surname: "Okello",
      phone: "0712000002",
      address: "Kisumu",
      schoolId: school2.id,
    },
  });

  // Demo students
  const studentPasswordHash = await bcrypt.hash("student123", 10);

  const class1ASchool1 = classes.find((cls) => cls.name === "1A" && cls.schoolId === school1.id);
  const class2ASchool1 = classes.find((cls) => cls.name === "2A" && cls.schoolId === school1.id);
  const class1BSchool2 = classes.find((cls) => cls.name === "1B" && cls.schoolId === school2.id);

  if (!class1ASchool1 || !class2ASchool1 || !class1BSchool2) {
    throw new Error("Expected demo classes 1A/2A/1B to exist for seeding students.");
  }

  const gradeLevelForClass = (gradeLevel: number): number => {
    const grade = gradeByLevel.get(gradeLevel);

    if (!grade) {
      throw new Error(`Grade for level ${gradeLevel} not found when creating students.`);
    }

    return grade.id;
  };

  const students = await Promise.all([
    prisma.student.create({
      data: {
        username: "std_1a_001",
        password: studentPasswordHash,
        name: "Amina",
        surname: "Mwangi",
        address: "Nairobi",
        sex: UserSex.FEMALE,
        parentId: parent1.id,
        classId: class1ASchool1.id,
        gradeId: gradeLevelForClass(class1ASchool1.gradeLevel),
        admissionYear: currentYear,
        admissionLevel: class1ASchool1.gradeLevel,
      },
    }),
    prisma.student.create({
      data: {
        username: "std_1a_002",
        password: studentPasswordHash,
        name: "Brian",
        surname: "Njoroge",
        address: "Nairobi",
        sex: UserSex.MALE,
        parentId: parent1.id,
        classId: class1ASchool1.id,
        gradeId: gradeLevelForClass(class1ASchool1.gradeLevel),
        admissionYear: currentYear,
        admissionLevel: class1ASchool1.gradeLevel,
      },
    }),
    prisma.student.create({
      data: {
        username: "std_2a_001",
        password: studentPasswordHash,
        name: "Cynthia",
        surname: "Otieno",
        address: "Nairobi",
        sex: UserSex.FEMALE,
        parentId: parent1.id,
        classId: class2ASchool1.id,
        gradeId: gradeLevelForClass(class2ASchool1.gradeLevel),
        admissionYear: currentYear,
        admissionLevel: class2ASchool1.gradeLevel,
      },
    }),
    prisma.student.create({
      data: {
        username: "std_1b_001",
        password: studentPasswordHash,
        name: "David",
        surname: "Omondi",
        address: "Kisumu",
        sex: UserSex.MALE,
        parentId: parent2.id,
        classId: class1BSchool2.id,
        gradeId: gradeLevelForClass(class1BSchool2.gradeLevel),
        admissionYear: currentYear,
        admissionLevel: class1BSchool2.gradeLevel,
      },
    }),
  ]);

  // Demo invoices and payments for first student
  const primaryStudent = students[0];

  const tuitionCategory = await prisma.feeCategory.findFirst({ where: { name: "Tuition" } });
  const mealsCategory = await prisma.feeCategory.findFirst({ where: { name: "Meals" } });

  if (tuitionCategory && mealsCategory && primaryStudent) {
    const tuitionFee = await prisma.studentFee.create({
      data: {
        studentId: primaryStudent.id,
        feeCategoryId: tuitionCategory.id,
        amountDue: 900000,
        amountPaid: 600000,
        status: "partially_paid",
        term: Term.TERM1,
        academicYear: currentYear,
      },
    });

    const mealsFee = await prisma.studentFee.create({
      data: {
        studentId: primaryStudent.id,
        feeCategoryId: mealsCategory.id,
        amountDue: 300000,
        amountPaid: 300000,
        status: "paid",
        term: Term.TERM1,
        academicYear: currentYear,
      },
    });

    const invoice = await prisma.invoice.create({
      data: {
        studentId: primaryStudent.id,
        term: Term.TERM1,
        dueDate: new Date(currentYear, 0, 31),
        totalAmount: tuitionFee.amountDue + mealsFee.amountDue,
        status: InvoiceStatus.PARTIALLY_PAID,
      },
    });

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        studentFeeId: tuitionFee.id,
        amount: 600000,
        method: PaymentMethod.CASH,
        reference: "CASH-DEMO-001",
      },
    });

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        studentFeeId: mealsFee.id,
        amount: 300000,
        method: PaymentMethod.MPESA,
        reference: "MPESA-DEMO-001",
      },
    });
  }

  console.log("✅ Dev seed complete. Test logins:");
  console.log("   Super admin:           superadmin / admin123");
  console.log("   School 1 admins:       admin_school1_a, admin_school1_b / admin123");
  console.log("   School 2 admins:       admin_school2_a, admin_school2_b / admin123\n");
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
