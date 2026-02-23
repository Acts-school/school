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
        const { title, description, order } = body;

        const updatedUnit = await prisma.unit.update({
            where: { id: Number.parseInt(resolvedParams.id, 10) },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(order !== undefined && { order }),
            },
        });

        return NextResponse.json({ data: updatedUnit });
    } catch (error) {
        console.error("Error updating unit:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const resolvedParams = await params;
    const { getServerSession } = await import("next-auth");
    const authOptions = (await import("@/pages/api/auth/[...nextauth]")).authOptions;
    const prisma = (await import("@/lib/prisma")).default;

    try {
        const session = await getServerSession(authOptions);

        // Only teachers/admins can delete
        if (!session?.user || !["admin", "teacher"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.unit.delete({
            where: { id: Number.parseInt(resolvedParams.id, 10) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting unit:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
