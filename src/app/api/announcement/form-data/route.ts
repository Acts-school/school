import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/{entity}/form-data:
 *   get:
 *     summary: Form uchun kerakli ma'lumotlarni olish
 *     tags: [Forms]
 *     responses:
 *       200:
 *         description: Form ma'lumotlari muvaffaqiyatli qaytarildi
 */
export async function GET(request: NextRequest) {
  try {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import("next-auth");
    const authOptions = (await import("@/pages/api/auth/[...nextauth]")).authOptions;
    const prisma = (await import("@/lib/prisma")).default;
    
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Avtorizatsiya talab qilinadi" },
        { status: 401 }
      );
    }

    // Default bo'sh ob'ekt qaytaramiz
    return NextResponse.json({});

  } catch (error) {
    console.error("Form data yuklashda xatolik:", error);
    return NextResponse.json(
      { error: "Server xatoligi" },
      { status: 500 }
    );
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';