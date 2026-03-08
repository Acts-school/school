import { NextRequest, NextResponse } from "next/server";

import { ITEM_PER_PAGE } from "@/lib/settings";
import { getParentsRepository } from "@/server/parentsRepository";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Import inside function to prevent build-time execution
  const { getServerSession } = await import("next-auth");
  const authOptions = (await import("@/pages/api/auth/[...nextauth]"))
    .authOptions;
  const { getCurrentSchoolContext } = await import("@/lib/authz");

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pageRaw = searchParams.get("page");
    const searchRaw = searchParams.get("search") ?? "";
    const limitRaw = searchParams.get("limit");

    const pageNumber = Number.parseInt(pageRaw ?? "1", 10);
    const limitNumber = Number.parseInt(
      limitRaw ?? ITEM_PER_PAGE.toString(),
      10,
    );

    const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const safeLimit =
      Number.isFinite(limitNumber) && limitNumber > 0 ? limitNumber : ITEM_PER_PAGE;

    const search = searchRaw.trim() === "" ? undefined : searchRaw.trim();

    const { schoolId } = await getCurrentSchoolContext();

    // School scoping is currently only enforced in the Prisma/Postgres path,
    // since student/class relations are not yet normalized into SQLite for
    // parents. This keeps multi-tenant behavior in web runtime while still
    // allowing a basic offline parent list in desktop mode.

    const repo = await getParentsRepository();

    const result = await repo.list({
      page: safePage,
      limit: safeLimit,
      search,
      req,
    });

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching parents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';