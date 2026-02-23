import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
    const prisma = (await import('@/lib/prisma')).default;

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { lessonId, dateTime, attendanceData } = body;

    if (!lessonId || !dateTime || !attendanceData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // To'liq vaqt bilan sana olish
    const attendanceDateTime = new Date(dateTime);

    // Bugungi sanani olish (faqat sana, vaqtsiz)
    const todayDate = new Date(attendanceDateTime.toDateString());

    // Mavjud qatnashish ma'lumotlarini o'chirish (faqat bugungi sanaga)
    await prisma.attendance.deleteMany({
      where: {
        lessonId: parseInt(lessonId),
        date: todayDate,
      },
    });

    // Yangi qatnashish ma'lumotlarini qo'shish (aniq vaqt bilan)
    const attendanceRecords = attendanceData.map((item: any) => ({
      studentId: item.studentId,
      lessonId: parseInt(lessonId),
      date: attendanceDateTime, // To'liq vaqt bilan saqlash
      present: item.present,
    }));

    await prisma.attendance.createMany({
      data: attendanceRecords,
    });

    return NextResponse.json({ message: 'Attendance saved successfully' });
  } catch (error) {
    console.error('Error saving bulk attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';