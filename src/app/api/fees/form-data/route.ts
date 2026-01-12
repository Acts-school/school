import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest): Promise<NextResponse<{ classes: Array<{ id: number; name: string }>; grades: Array<{ id: number; level: number }> } | { error: string }>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [classes, grades] = await Promise.all([
      prisma.class.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.grade.findMany({
        select: { id: true, level: true },
        orderBy: { level: "asc" },
      }),
    ]);

    return NextResponse.json({ classes, grades });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error loading fee form data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
