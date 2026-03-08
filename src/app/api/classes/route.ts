import { NextRequest, NextResponse } from 'next/server';

import { getClassesRepository } from '@/server/classesRepository';

export async function GET(req: NextRequest) {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
    const { getCurrentSchoolContext } = await import('@/lib/authz');

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const supervisorId = searchParams.get('supervisorId');
    const gradeId = searchParams.get('gradeId');
    const limit = parseInt(searchParams.get('limit') || '10');

    const { schoolId } = await getCurrentSchoolContext();

    const classesRepo = await getClassesRepository();
    const result = await classesRepo.list({
      req,
      page,
      limit,
      search,
      supervisorId,
      gradeId,
      schoolId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
  const { getCurrentSchoolContext } = await import('@/lib/authz');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

    const classesRepo = await getClassesRepository();
    await classesRepo.delete(parseInt(id, 10), schoolId, isSuperAdmin);

    return NextResponse.json({ 
      success: true, 
      message: 'Class muvaffaqiyatli o\'chirildi' 
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    if (error instanceof Error && (error.message === 'Class not found' || error.message === 'Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Class not found' ? 404 : 403 });
    }
    return NextResponse.json(
      { error: 'Class o\'chirishda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';