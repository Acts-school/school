import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
    const { getServerSession } = await import("next-auth");
    const authOptions = (await import("@/pages/api/auth/[...nextauth]")).authOptions;
    const prisma = (await import("@/lib/prisma")).default;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== "student") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { lessonId, completed } = body;

        if (!lessonId) {
            return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
        }

        const studentId = session.user.id;

        // Upsert lesson progress
        const progress = await prisma.lessonProgress.upsert({
            where: {
                studentId_lessonId: {
                    studentId,
                    lessonId: Number.parseInt(lessonId, 10),
                },
            },
            update: {
                completed: completed === true,
                completedAt: completed ? new Date() : null,
            },
            create: {
                studentId,
                lessonId: Number.parseInt(lessonId, 10),
                completed: completed === true,
                completedAt: completed ? new Date() : null,
            },
        });

        return NextResponse.json({ data: progress });
    } catch (error) {
        console.error("Error updating lesson progress:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
