import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse<{
  classes: Array<{ id: number; name: string }>; 
  grades: Array<{ id: number; level: number }> 
} | { error: string }>> {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import('next-auth');
  const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
  const prisma = (await import('@/lib/prisma')).default;
  
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [classes, grades] = await Promise.all([
      prisma.class.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.grade.findMany({
        select: { id: true, level: true },
        orderBy: { level: "asc" },
      }),
    ]);

    return NextResponse.json({ classes, grades });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error loading fee form data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';