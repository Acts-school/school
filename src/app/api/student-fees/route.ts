import { NextRequest, NextResponse } from "next/server";

import { getStudentFeesRepository, type StudentFeeListItem } from "@/server/studentFeesRepository";

interface ApiResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<StudentFeeListItem> | { error: string }>> {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import("next-auth");
  const authOptions = (await import("@/pages/api/auth/[...nextauth]"))
    .authOptions;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const structureIdParam = searchParams.get("structureId");
    if (!structureIdParam) {
      return NextResponse.json(
        { error: "structureId is required" },
        { status: 400 },
      );
    }

    const structureId = Number.parseInt(structureIdParam, 10);
    if (Number.isNaN(structureId)) {
      return NextResponse.json(
        { error: "Invalid structureId" },
        { status: 400 },
      );
    }

    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");
    const searchRaw = searchParams.get("search") ?? "";

    const pageNumber = Number.parseInt(pageRaw ?? "1", 10);
    const limitNumber = Number.parseInt(limitRaw ?? "10", 10);

    const page = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const limit = Number.isFinite(limitNumber) && limitNumber > 0 ? limitNumber : 10;

    const search = searchRaw.trim() === "" ? undefined : searchRaw.trim();

    const repo = await getStudentFeesRepository();

    const result = await repo.list({
      page,
      limit,
      structureId,
      search,
      req,
    });

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching student fees:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';