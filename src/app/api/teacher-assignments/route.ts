import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
    const prisma = (await import('@/lib/prisma')).default;
    const { getCurrentSchoolContext } = await import('@/lib/authz');

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 });
    }

    const { schoolId } = await getCurrentSchoolContext();

    const assignments = await prisma.assignment.findMany({
      where: {
        lesson: {
          teacherId,
          ...(schoolId !== null
            ? ({ class: { schoolId } } as unknown as Record<string, unknown>)
            : {}),
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            name: true,
            day: true,
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
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching teacher assignments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';