import { NextRequest, NextResponse } from 'next/server';

import { getSubjectsRepository } from '@/server/subjectsRepository';

export async function GET(req: NextRequest) {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    const subjectsRepo = await getSubjectsRepository();
    const result = await subjectsRepo.list({
      req,
      page,
      limit,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching subjects:', error);
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
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    const { isSuperAdmin } = await getCurrentSchoolContext();

    const subjectsRepo = await getSubjectsRepository();
    await subjectsRepo.delete(parseInt(id, 10), isSuperAdmin);

    return NextResponse.json({ 
      success: true, 
      message: 'Subject muvaffaqiyatli o\'chirildi' 
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    if (error instanceof Error && (error.message === 'Subject not found' || error.message === 'Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Subject not found' ? 404 : 403 });
    }
    return NextResponse.json(
      { error: 'Subject o\'chirishda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';