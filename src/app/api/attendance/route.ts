import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function GET(req: NextRequest) {
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