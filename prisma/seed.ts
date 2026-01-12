import { PrismaClient, EducationStage } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedFees } from "./seed-fees";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Database seeding started...");

  // Admin parollarini yangilash
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const accountantPassword = await bcrypt.hash("accountant123", 10);
  
  try {
    await prisma.admin.upsert({
      where: { username: "admin1" },
      create: {
        username: "admin1",
        password: hashedPassword,
      },
      update: {
        password: hashedPassword,
      },
    });

    await prisma.admin.upsert({
      where: { username: "admin2" },
      create: {
        username: "admin2",
        password: hashedPassword,
      },
      update: {
        password: hashedPassword,
      },
    });

    console.log("✅ Admin users updated successfully!");
  } catch (error) {
    console.log("❌ Error updating admin users:", error);
  }

  // Accountant user
  try {
    await prisma.accountant.upsert({
      where: { username: "accountant1" },
      create: { username: "accountant1", password: accountantPassword },
      update: { password: accountantPassword },
    });
    console.log("✅ Accountant user seeded successfully!");
  } catch (error) {
    console.log("❌ Error seeding accountant user:", error);
  }

  // FEES: previously seeded demo FeeStructure rows here (now disabled for production data)

  const gradeLevelToId = new Map<number, number>();

  // GRADE
  try {
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

    for (const grade of canonicalGrades) {
      await prisma.grade.upsert({
        where: { level: grade.level },
        create: {
          level: grade.level,
          stage: grade.stage,
        },
        update: {
          stage: grade.stage,
        },
      });
    }

    const gradeRows = await prisma.grade.findMany({
      select: { id: true, level: true },
    });

    for (const grade of gradeRows) {
      gradeLevelToId.set(grade.level, grade.id);
    }

    console.log("Grades created or updated successfully!");
  } catch (error) {
    console.log("Error creating or updating grades. They may already exist.", error);
  }

  // CLASS
  try {
    for (let i = 1; i <= 6; i++) {
      const gradeLevel = i;
      const gradeId = gradeLevelToId.get(gradeLevel);

      if (!gradeId) {
        throw new Error(`Grade ID not found for level ${gradeLevel}`);
      }

      await prisma.class.create({
        data: {
          name: `${i}A`,
          gradeId,
          capacity: Math.floor(Math.random() * (20 - 15 + 1)) + 15,
        },
      });
    }
    console.log("Classes created successfully!");
  } catch (error) {
    console.log("Classes may already exist, skipping...", error);
  }

  // FEES (categories, payment info, ECDE & Primary class fee structures) were previously
  // seeded via seedFees() and are now disabled so all fee data comes from real usage.

  // SUBJECT
  try {
    const subjectData = [
      { name: "Mathematics" },
      { name: "Science" },
      { name: "English" },
      { name: "History" },
      { name: "Geography" },
      { name: "Physics" },
      { name: "Chemistry" },
      { name: "Biology" },
      { name: "Computer Science" },
      { name: "Art" },
    ];

    for (const subject of subjectData) {
      await prisma.subject.create({ data: subject });
    }
    console.log("Subjects created successfully!");
  } catch (error) {
    console.log("Subjects may already exist, skipping...")
  }

  // EVENT
  for (let i = 1; i <= 5; i++) {
    await prisma.event.create({
      data: {
        title: `Event ${i}`, 
        description: `Description for Event ${i}`, 
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)), 
        endTime: new Date(new Date().setHours(new Date().getHours() + 2)), 
        classId: (i % 5) + 1, 
      },
    });
  }

  // ANNOUNCEMENT
  for (let i = 1; i <= 5; i++) {
    await prisma.announcement.create({
      data: {
        title: `Announcement ${i}`, 
        description: `Description for Announcement ${i}`, 
        date: new Date(), 
        classId: (i % 5) + 1, 
      },
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
