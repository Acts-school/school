import { NextRequest, NextResponse } from "next/server";

import { getTeachersRepository } from "@/server/teachersRepository";

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
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");
    const searchRaw = searchParams.get("search") ?? "";
    const classId = searchParams.get("classId") ?? undefined;

    const pageNumber = Number.parseInt(pageRaw ?? "1", 10);
    const limitNumber = Number.parseInt(limitRaw ?? "10", 10);

    const page = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const limit = Number.isFinite(limitNumber) && limitNumber > 0 ? limitNumber : 10;

    const search = searchRaw.trim() === "" ? undefined : searchRaw.trim();

    const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

    // School scoping is enforced only in the Prisma/Postgres path for now,
    // because schoolUser memberships are not yet normalized into SQLite.
    // This preserves existing multi-tenant behavior in web/runtime while
    // still allowing basic offline teacher listing in desktop mode.

    const repo = await getTeachersRepository();

    const result = await repo.list({
      page,
      limit,
      search,
      classId,
      req,
    });

    // Prisma implementation of the repository will still look at schoolId
    // and isSuperAdmin via getCurrentSchoolContext if we extend it later.
    // For now, we return the repository result directly.

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching teachers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
  const prisma = (await import('@/lib/prisma')).default;
  const { getCurrentSchoolContext } = await import('@/lib/authz');
  
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

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';