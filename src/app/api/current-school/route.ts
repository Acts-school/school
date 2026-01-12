import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

type SetCurrentSchoolBody = {
  schoolId: number | null;
};

const isSetCurrentSchoolBody = (value: unknown): value is SetCurrentSchoolBody => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { schoolId?: unknown };
  return (
    candidate.schoolId === null ||
    (typeof candidate.schoolId === "number" && Number.isFinite(candidate.schoolId))
  );
};

type CurrentSchoolPrisma = {
  schoolUser: {
    findFirst: (args: {
      where: { userId: string; role?: string; schoolId?: number };
      select: { id?: true; schoolId?: true };
    }) => Promise<{ id?: number; schoolId?: number } | null>;
  };
};

const currentSchoolPrisma = prisma as unknown as CurrentSchoolPrisma;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = (await req.json()) as unknown;

    if (!isSetCurrentSchoolBody(json)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { schoolId } = json;

    const response = NextResponse.json({ ok: true });

    if (schoolId === null) {
      // Only SUPER_ADMIN users may switch to global (all schools) mode
      const superAdminMembership = await currentSchoolPrisma.schoolUser.findFirst({
        where: { userId, role: "SUPER_ADMIN" },
        select: { id: true },
      });

      if (!superAdminMembership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Clear school selection: getCurrentSchoolContext will detect no valid cookie
      response.cookies.set("currentSchoolId", "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    } else {
      const membership = await currentSchoolPrisma.schoolUser.findFirst({
        where: { userId, schoolId },
        select: { schoolId: true },
      });

      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      response.cookies.set("currentSchoolId", String(schoolId), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Failed to set current school", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
