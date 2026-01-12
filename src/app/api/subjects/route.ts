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
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Query filter
    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [subjects, totalCount] = await prisma.$transaction([
      prisma.subject.findMany({
        where,
        include: {
          teachers: {
            select: { name: true, surname: true },
          },
          _count: {
            select: {
              teachers: true,
              lessons: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      }),
      prisma.subject.count({ where }),
    ]);

    return NextResponse.json({
      data: subjects,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
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
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    // Subject mavjudligini tekshirish
    const existingSubject = await prisma.subject.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingSubject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const { isSuperAdmin } = await getCurrentSchoolContext();

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.subject.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Subject muvaffaqiyatli o\'chirildi' 
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json(
      { error: 'Subject o\'chirishda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}