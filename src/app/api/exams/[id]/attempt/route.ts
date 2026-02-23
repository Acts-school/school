import { NextRequest, NextResponse } from "next/server";

// Start an exam attempt
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const { getServerSession } = await import("next-auth");
    const authOptions = (await import("@/pages/api/auth/[...nextauth]")).authOptions;
    const prisma = (await import("@/lib/prisma")).default;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== "student") {
            return NextResponse.json({ error: "Unauthorized. Only students can take exams." }, { status: 401 });
        }

        const student = await prisma.student.findUnique({
            where: { username: session.user.username } // user ID in next-auth is the username
        });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        const examId = parseInt(resolvedParams.id, 10);

        // Check if an attempt already exists and is in progress
        const existingAttempt = await prisma.examAttempt.findFirst({
            where: {
                examId,
                studentId: student.id,
                status: "IN_PROGRESS"
            }
        });

        if (existingAttempt) {
            return NextResponse.json({ data: existingAttempt });
        }

        // Otherwise create a new attempt
        const newAttempt = await prisma.examAttempt.create({
            data: {
                examId,
                studentId: student.id,
                status: "IN_PROGRESS",
                startTime: new Date()
            }
        });

        return NextResponse.json({ data: newAttempt });
    } catch (error) {
        console.error("Error starting exam attempt:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Submit an exam attempt
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

        if (!session?.user || session.user.role !== "student") {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const student = await prisma.student.findUnique({
            where: { username: session.user.username }
        });

        const examId = parseInt(resolvedParams.id, 10);
        const body = (await req.json()) as {
            attemptId: string | number;
            answers: { questionId: number; choiceId?: number; textResponse?: string }[];
        };
        const { attemptId, answers } = body;

        if (!student || !attemptId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const attempt = await prisma.examAttempt.findUnique({
            where: { id: typeof attemptId === "string" ? parseInt(attemptId, 10) : attemptId }
        });

        if (!attempt || attempt.studentId !== student.id || attempt.status === "COMPLETED") {
            return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
        }

        // Grade the answers automatically where possible
        let totalScore = 0;

        // 1. Fetch all questions for this exam to know correct choices
        const examQuestions = await prisma.examQuestion.findMany({
            where: { examId },
            include: {
                question: {
                    include: { choices: true }
                }
            }
        });

        type AnswerRecord = {
            attemptId: number;
            questionId: number;
            choiceId: number | null;
            textResponse: string | null;
            isCorrect: boolean | null;
            pointsAwarded: number;
        };

        const answerRecords: AnswerRecord[] = [];

        // 2. Loop through submitted answers and grade
        for (const ans of (answers || [])) {
            const eq = examQuestions.find((eqNode: any) => eqNode.questionId === ans.questionId);
            if (!eq) continue;

            const q = eq.question;
            let isCorrect: boolean | null = null;
            let pointsAwarded = 0;

            if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
                const correctChoice = q.choices.find((c: any) => c.isCorrect);
                if (correctChoice && correctChoice.id === ans.choiceId) {
                    isCorrect = true;
                    pointsAwarded = q.points;
                } else {
                    isCorrect = false;
                }
            } else {
                // Short answer (needs manual grading usually, set points to 0 for now)
                isCorrect = null;
            }

            totalScore += pointsAwarded;

            answerRecords.push({
                attemptId: attempt.id,
                questionId: q.id,
                choiceId: ans.choiceId || null,
                textResponse: ans.textResponse || null,
                isCorrect,
                pointsAwarded
            });
        }

        // 3. Save answers within a transaction
        await prisma.$transaction(async (tx: any) => {
            if (answerRecords.length > 0) {
                await tx.studentAnswer.createMany({
                    data: answerRecords
                });
            }

            // Create or update result
            let result = await tx.result.findFirst({
                where: { examId, studentId: student.id }
            });

            if (result) {
                result = await tx.result.update({
                    where: { id: result.id },
                    data: { score: totalScore }
                });
            } else {
                result = await tx.result.create({
                    data: {
                        examId,
                        studentId: student.id,
                        score: totalScore
                    }
                });
            }

            // Mark attempt complete
            await tx.examAttempt.update({
                where: { id: attempt.id },
                data: {
                    status: "COMPLETED",
                    endTime: new Date(),
                    resultId: result.id
                }
            });
        });

        return NextResponse.json({ success: true, score: totalScore });
    } catch (error) {
        console.error("Error submitting exam:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
