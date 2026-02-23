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
        const { assignmentId, fileUrl, textContent } = body;

        if (!assignmentId || (!fileUrl && !textContent)) {
            return NextResponse.json(
                { error: "assignmentId and either fileUrl or textContent are required" },
                { status: 400 }
            );
        }

        const submission = await prisma.assignmentSubmission.create({
            data: {
                assignmentId: Number.parseInt(assignmentId, 10),
                studentId: session.user.id,
                fileUrl,
                textContent,
                status: "SUBMITTED",
            },
        });

        return NextResponse.json({ data: submission }, { status: 201 });
    } catch (error) {
        console.error("Error creating assignment submission:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
