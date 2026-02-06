import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/teacher/form-data:
 *   get:
 *     summary: Teacher form uchun kerakli ma'lumotlarni olish
 *     tags: [Teachers]
 *     responses:
 *       200:
 *         description: Form ma'lumotlari muvaffaqiyatli qaytarildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subjects:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *       401:
 *         description: Avtorizatsiya talab qilinadi
 *       500:
 *         description: Server xatoligi
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

    const teacherSubjects = await prisma.subject.findMany({
      select: { id: true, name: true },
    });

    return NextResponse.json({
      subjects: teacherSubjects
    });

  } catch (error) {
    console.error("Teacher form data yuklashda xatolik:", error);
    return NextResponse.json(
      { error: "Server xatoligi" },
      { status: 500 }
    );
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';