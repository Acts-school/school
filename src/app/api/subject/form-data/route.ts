import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/subject/form-data:
 *   get:
 *     summary: Subject form uchun kerakli ma'lumotlarni olish
 *     tags: [Subjects]
 *     responses:
 *       200:
 *         description: Form ma'lumotlari muvaffaqiyatli qaytarildi
 */
export async function GET(request: NextRequest) {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
    const prisma = (await import('@/lib/prisma')).default;

  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Avtorizatsiya talab qilinadi" },
        { status: 401 }
      );
    }

    const subjectTeachers = await prisma.teacher.findMany({
      select: { id: true, name: true, surname: true },
    });

    return NextResponse.json({
      teachers: subjectTeachers
    });

  } catch (error) {
    console.error("Subject form data yuklashda xatolik:", error);
    return NextResponse.json(
      { error: "Server xatoligi" },
      { status: 500 }
    );
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';