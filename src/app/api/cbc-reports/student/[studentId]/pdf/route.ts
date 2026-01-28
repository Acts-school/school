import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  studentId: string | string[] | undefined;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(
  _req: NextRequest,
  _context: RouteContext,
): Promise<NextResponse> {
  return NextResponse.json(
    {
      error:
        "This CBC term report PDF endpoint has been deprecated. Please use the HTML print page at /cbc-reports/student/[studentId]/print.",
    },
    { status: 410 },
  );
}
