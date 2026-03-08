import { NextRequest, NextResponse } from "next/server";

import { getStudentsRepository } from "@/server/studentsRepository";

export async function GET(req: NextRequest) {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import("next-auth");
  const authOptions = (await import("@/pages/api/auth/[...nextauth]"))
    .authOptions;
  const { getCurrentSchoolContext } = await import("@/lib/authz");

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const rawSearch = searchParams.get("search") ?? "";
    const classId = searchParams.get("classId") ?? undefined;
    const teacherId = searchParams.get("teacherId") ?? undefined;
    const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10);

    const search = rawSearch.trim() === "" ? undefined : rawSearch.trim();

    const { schoolId } = await getCurrentSchoolContext();

    const repo = await getStudentsRepository();

    const result = await repo.list({
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
      search,
      classId,
      teacherId,
      schoolId,
      req,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
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

export async function DELETE(req: NextRequest) {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
  const prisma = (await import('@/lib/prisma')).default;
  const { getCurrentSchoolContext } = await import('@/lib/authz');
  const studentDeletePrisma = prisma as unknown as StudentDeletePrisma;
  
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

    await prisma.student.update({
      where: { id },
      data: {
        status: "LEFT",
      },
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

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';