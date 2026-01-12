import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getCurrentSchoolContext } from '@/lib/authz';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
    }

    const { schoolId } = await getCurrentSchoolContext();

    // O'qituvchining darslarini olish
    const lessons = await prisma.lesson.findMany({
      where: {
        teacherId,
        ...(schoolId !== null
          ? { class: { schoolId } as unknown as Record<string, unknown> }
          : {}),
      },
      include: {
        subject: {
          select: {
            name: true,
          },
        },
        class: {
          select: {
            name: true,
            students: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },
          },
        },
      },
      orderBy: [
        { subject: { name: 'asc' } },
        { class: { name: 'asc' } },
      ],
    });

    return NextResponse.json(lessons);
  } catch (error) {
    console.error('Error fetching teacher lessons:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}