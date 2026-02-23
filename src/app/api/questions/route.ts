import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { getServerSession } = await import("next-auth");
    const authOptions = (await import("@/pages/api/auth/[...nextauth]")).authOptions;
    const prisma = (await import("@/lib/prisma")).default;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || !["admin", "teacher"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const subjectId = searchParams.get("subjectId");

        if (!subjectId) {
            return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
        }

        const questions = await prisma.question.findMany({
            where: { subjectId: parseInt(subjectId, 10) },
            include: { choices: true },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ data: questions });
    } catch (error) {
        console.error("Error fetching questions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const { getServerSession } = await import("next-auth");
    const authOptions = (await import("@/pages/api/auth/[...nextauth]")).authOptions;
    const prisma = (await import("@/lib/prisma")).default;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || !["admin", "teacher"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await req.json()) as {
            subjectId: string | number;
            type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
            text: string;
            points?: string | number;
            choices?: { text: string; isCorrect?: boolean }[];
        };
        const { subjectId, type, text, points, choices } = body;

        if (!subjectId || !type || !text) {
            return NextResponse.json(
                { error: "Missing required fields (subjectId, type, text)" },
                { status: 400 }
            );
        }

        const dataPayload: any = {
            subjectId: typeof subjectId === "string" ? parseInt(subjectId, 10) : subjectId,
            type,
            text,
            points: points ? (typeof points === "string" ? parseInt(points, 10) : points) : 1,
        };

        if (choices && choices.length > 0) {
            dataPayload.choices = {
                create: choices.map((c) => ({
                    text: c.text,
                    isCorrect: c.isCorrect || false,
                }))
            };
        }

        const question = await prisma.question.create({
            data: dataPayload,
            include: { choices: true }
        });

        return NextResponse.json({ data: question });
    } catch (error) {
        console.error("Error creating question:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
