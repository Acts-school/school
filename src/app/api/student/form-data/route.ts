import { NextRequest, NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";

/**
 * @swagger
 * /api/student/form-data:
 *   get:
 *     summary: Student form uchun kerakli ma'lumotlarni olish
 *     tags: [Students]
 *     responses:
 *       200:
 *         description: Form ma'lumotlari muvaffaqiyatli qaytarildi
 */
export async function GET(request: NextRequest) {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
    const prisma = (await import('@/lib/prisma')).default;
    const { getCurrentSchoolContext } = await import('@/lib/authz');

  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Avtorizatsiya talab qilinadi" },
        { status: 401 }
      );
    }

    const studentGrades = await prisma.grade.findMany({
      select: { id: true, level: true },
    });

    const { schoolId } = await getCurrentSchoolContext();

    const classWhere: Prisma.ClassWhereInput = {};

    if (schoolId !== null) {
      (classWhere as Record<string, unknown>).schoolId = schoolId;
    }

    const studentClasses = await prisma.class.findMany({
      where: classWhere,
      include: { _count: { select: { students: true } } },
    });

    return NextResponse.json({
      classes: studentClasses,
      grades: studentGrades
    });

  } catch (error) {
    console.error("Student form data yuklashda xatolik:", error);
    return NextResponse.json(
      { error: "Server xatoligi" },
      { status: 500 }
    );
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';