import { NextRequest, NextResponse } from "next/server";

// Get questions for a specific exam
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const { getServerSession } = await import("next-auth");
    const authOptions = (await import("@/pages/api/auth/[...nextauth]")).authOptions;
    const prisma = (await import("@/lib/prisma")).default;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const examId = parseInt(resolvedParams.id, 10);

        const examQuestions = await prisma.examQuestion.findMany({
            where: { examId },
            include: {
                question: {
                    include: { choices: true }
                }
            },
            orderBy: { order: 'asc' }
        });

        return NextResponse.json({ data: examQuestions });
    } catch (error) {
        console.error("Error fetching exam questions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Bulk update questions for an exam
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const { getServerSession } = await import("next-auth");
    const authOptions = (await import("@/pages/api/auth/[...nextauth]")).authOptions;
    const prisma = (await import("@/lib/prisma")).default;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || !["admin", "teacher"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { questionIds } = body; // Array of question IDs in order

        if (!Array.isArray(questionIds)) {
            return NextResponse.json({ error: "questionIds must be an array" }, { status: 400 });
        }

        const examId = parseInt(resolvedParams.id, 10);

        // Run within a transaction
        await prisma.$transaction(async (tx: any) => {
            // Remove existing
            await tx.examQuestion.deleteMany({
                where: { examId }
            });

            // Insert new in order
            if (questionIds.length > 0) {
                const creates = questionIds.map((qId: number, index: number) => ({
                    examId,
                    questionId: qId,
                    order: index
                }));

                await tx.examQuestion.createMany({
                    data: creates
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating exam questions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
