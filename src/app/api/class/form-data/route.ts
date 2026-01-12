import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

/**
 * @swagger
 * /api/class/form-data:
 *   get:
 *     summary: Class form uchun kerakli ma'lumotlarni olish
 *     tags: [Classes]
 *     responses:
 *       200:
 *         description: Form ma'lumotlari muvaffaqiyatli qaytarildi
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Avtorizatsiya talab qilinadi" },
        { status: 401 }
      );
    }

    const classGrades = await prisma.grade.findMany({
      select: { id: true, level: true },
    });
    const classTeachers = await prisma.teacher.findMany({
      select: { id: true, name: true, surname: true },
    });

    return NextResponse.json({
      teachers: classTeachers,
      grades: classGrades
    });

  } catch (error) {
    console.error("Class form data yuklashda xatolik:", error);
    return NextResponse.json(
      { error: "Server xatoligi" },
      { status: 500 }
    );
  }
}