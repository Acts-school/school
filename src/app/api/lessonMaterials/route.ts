import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
    const { getServerSession } = await import("next-auth");
    const authOptions = (await import("@/pages/api/auth/[...nextauth]")).authOptions;
    const prisma = (await import("@/lib/prisma")).default;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || !["admin", "teacher"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, type, url, content, lessonId } = body;

        if (!title || !type || !lessonId) {
            return NextResponse.json(
                { error: "Title, type, and lessonId are required" },
                { status: 400 }
            );
        }

        const material = await prisma.lessonMaterial.create({
            data: {
                title,
                type,
                url,
                content,
                lessonId: Number.parseInt(lessonId, 10),
            },
        });

        return NextResponse.json({ data: material }, { status: 201 });
    } catch (error) {
        console.error("Error creating lesson material:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
