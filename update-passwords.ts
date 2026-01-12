import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin foydalanuvchilarini yaratish
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  await prisma.admin.upsert({
    where: { username: "admin1" },
    create: {
      username: "admin1",
      password: hashedPassword,
    },
    update: {
      password: hashedPassword,
    }
  });

  await prisma.admin.upsert({
    where: { username: "admin2" },
    create: {
      username: "admin2", 
      password: hashedPassword,
    },
    update: {
      password: hashedPassword,
    }
  });

  // Teacher parollarini yangilash
  const teacherPassword = await bcrypt.hash("teacher123", 10);
  for (let i = 1; i <= 15; i++) {
    try {
      await prisma.teacher.update({
        where: { username: `teacher${i}` },
        data: { password: teacherPassword }
      });
    } catch (error) {
      console.log(`Teacher${i} topilmadi, o'tkazib yuborildi`);
    }
  }

  // Student parollarini yangilash
  const studentPassword = await bcrypt.hash("student123", 10);
  for (let i = 1; i <= 50; i++) {
    try {
      await prisma.student.update({
        where: { username: `student${i}` },
        data: { password: studentPassword }
      });
    } catch (error) {
      console.log(`Student${i} topilmadi, o'tkazib yuborildi`);
    }
  }

  // Parent parollarini yangilash
  const parentPassword = await bcrypt.hash("parent123", 10);
  for (let i = 1; i <= 25; i++) {
    try {
      await prisma.parent.update({
        where: { username: `parentId${i}` },
        data: { password: parentPassword }
      });
    } catch (error) {
      console.log(`ParentId${i} topilmadi, o'tkazib yuborildi`);
    }
  }

  console.log("✅ Seeding completed successfully!");
  console.log("\n🔑 Login ma'lumotlari:");
  console.log("👨‍💼 Admin: admin1 / admin123");
  console.log("👨‍💼 Admin: admin2 / admin123");
  console.log("👨‍🏫 Teacher: teacher1 / teacher123");
  console.log("👨‍🎓 Student: student1 / student123");
  console.log("👨‍👩‍👧‍👦 Parent: parentId1 / parent123");
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