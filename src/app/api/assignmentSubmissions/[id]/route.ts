import { NextRequest, NextResponse } from "next/server";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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
        const { score } = body;

        if (score === undefined) {
            return NextResponse.json({ error: "score is required" }, { status: 400 });
        }

        const submissionId = Number.parseInt(resolvedParams.id, 10);

        const submission = await prisma.assignmentSubmission.findUnique({
            where: { id: submissionId },
            include: { assignment: true },
        });

        if (!submission) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Upsert a result linked to the student and assignment
        const result = await prisma.result.upsert({
            where: {
                id: submission.resultId ?? -1 // -1 forces a create if the resultId is null
            },
            update: {
                score: Number.parseInt(score, 10),
            },
            create: {
                score: Number.parseInt(score, 10),
                assignmentId: submission.assignmentId,
                studentId: submission.studentId,
            },
        });

        // Update submission status to GRADED and link the result
        const updatedSubmission = await prisma.assignmentSubmission.update({
            where: { id: submissionId },
            data: {
                status: "GRADED",
                resultId: result.id,
            },
            include: {
                result: true,
            }
        });

        return NextResponse.json({ data: updatedSubmission });
    } catch (error) {
        console.error("Error grading submission:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
