import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
    const prisma = (await import('@/lib/prisma')).default;

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');
    const date = searchParams.get('date');

    if (!lessonId || !date) {
      return NextResponse.json({ error: 'Lesson ID and date are required' }, { status: 400 });
    }

    // Bugungi sanada ushbu dars uchun qatnashish ma'lumotlarini olish
    const attendance = await prisma.attendance.findMany({
      where: {
        lessonId: parseInt(lessonId),
        date: new Date(date),
      },
      select: {
        studentId: true,
        present: true,
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';