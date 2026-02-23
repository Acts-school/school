import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest): Promise<NextResponse> {
    const { getServerSession } = await import("next-auth");
    const authOptions = (await import("@/pages/api/auth/[...nextauth]")).authOptions;
    const prisma = (await import("@/lib/prisma")).default;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const subjectIdParam = searchParams.get("subjectId");
        const classIdParam = searchParams.get("classId");

        const where: Prisma.UnitWhereInput = {};

        if (subjectIdParam) {
            where.subjectId = Number.parseInt(subjectIdParam, 10);
        }
        if (classIdParam) {
            where.classId = Number.parseInt(classIdParam, 10);
        }

        const units = await prisma.unit.findMany({
            where,
            orderBy: { order: "asc" },
            include: {
                lessons: {
                    orderBy: { order: "asc" },
                    include: {
                        materials: true,
                        progress: {
                            where: {
                                studentId: session.user.role === 'student' ? session.user.id : undefined
                            }
                        }
                    }
                },
            },
        });

        return NextResponse.json({ data: units });
    } catch (error) {
        console.error("Error fetching units:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const { getServerSession } = await import("next-auth");
    const authOptions = (await import("@/pages/api/auth/[...nextauth]")).authOptions;
    const prisma = (await import("@/lib/prisma")).default;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || !['admin', 'teacher'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, subjectId, classId, order } = body;

        if (!title || !subjectId) {
            return NextResponse.json({ error: "Title and subjectId are required" }, { status: 400 });
        }

        const newUnit = await prisma.unit.create({
            data: {
                title,
                description,
                subjectId: Number.parseInt(subjectId, 10),
                classId: classId ? Number.parseInt(classId, 10) : null,
                order: order ? Number.parseInt(order, 10) : 0,
            },
        });

        return NextResponse.json({ data: newUnit }, { status: 201 });
    } catch (error) {
        console.error("Error creating unit:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
