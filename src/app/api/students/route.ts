import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import type { Prisma } from '@prisma/client';
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
    const teacherId = searchParams.get('teacherId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    // Query filter
    const where: Prisma.StudentWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { surname: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const classFilter: Prisma.ClassWhereInput = {};

    if (classId) {
      classFilter.id = parseInt(classId, 10);
    }

    if (teacherId && session.user.role === 'teacher') {
      classFilter.lessons = {
        some: {
          teacherId,
        },
      };
    }

    const { schoolId } = await getCurrentSchoolContext();

    if (schoolId !== null) {
      (classFilter as Record<string, unknown>).schoolId = schoolId;
    }

    if (Object.keys(classFilter).length > 0) {
      where.class = classFilter;
    }

    const [students, totalCount] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        include: {
          class: {
            select: { name: true },
          },
          grade: {
            select: { level: true },
          },
          parent: {
            select: { name: true, surname: true, phone: true },
          },
          _count: {
            select: {
              attendances: true,
              results: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({
      data: students,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

type StudentDeleteRow = {
  id: string;
  class: { schoolId: number | null } | null;
};

type StudentDeletePrisma = {
  student: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; class: { select: { schoolId: true } } };
    }) => Promise<StudentDeleteRow | null>;
    delete: (args: { where: { id: string } }) => Promise<unknown>;
  };
};

const studentDeletePrisma = prisma as unknown as StudentDeletePrisma;

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Student mavjudligini tekshirish
    const existingStudent = await studentDeletePrisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        class: {
          select: { schoolId: true },
        },
      },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

    const targetSchoolId = existingStudent.class?.schoolId ?? null;

    if (!isSuperAdmin) {
      if (schoolId === null || targetSchoolId === null || targetSchoolId !== schoolId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    await prisma.student.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Student muvaffaqiyatli o\'chirildi' 
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Student o\'chirishda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}