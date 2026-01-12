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
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const classId = searchParams.get('classId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Query filter
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { surname: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (classId) {
      where.lessons = {
        some: {
          classId: parseInt(classId, 10),
        },
      };
    }

    const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

    if (schoolId !== null && !isSuperAdmin) {
      type TeacherMembershipRow = { userId: string };

      const memberships: TeacherMembershipRow[] = await prisma.schoolUser.findMany({
        where: {
          schoolId,
          role: 'TEACHER',
        },
        select: { userId: true },
      });

      if (memberships.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }

      const teacherIds = memberships.map((m) => m.userId);
      where.id = { in: teacherIds };
    }

    const [teachers, totalCount] = await prisma.$transaction([
      prisma.teacher.findMany({
        where,
        include: {
          subjects: {
            select: { name: true },
          },
          classes: {
            select: { name: true },
          },
          _count: {
            select: {
              subjects: true,
              lessons: true,
              classes: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teacher.count({ where }),
    ]);

    return NextResponse.json({
      data: teachers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
    }

    // Teacher mavjudligini tekshirish
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!existingTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const { isSuperAdmin } = await getCurrentSchoolContext();

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.teacher.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Teacher muvaffaqiyatli o\'chirildi' 
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json(
      { error: 'Teacher o\'chirishda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}