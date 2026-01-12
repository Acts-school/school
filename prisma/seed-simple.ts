import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Database seeding started...");

  // Admin parollarini yangilash
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
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

    console.log("✅ Admin users ready!");
    console.log("🔑 Login: admin1 / admin123");
    console.log("🔑 Login: admin2 / admin123");
    
  } catch (error) {
    console.log("❌ Error:", error);
  }
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