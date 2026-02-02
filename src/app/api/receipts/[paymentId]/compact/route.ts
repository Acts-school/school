import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  paymentId: string | string[] | undefined;
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
        "This compact receipt PDF endpoint has been deprecated. Please use the HTML print page at /finance/receipts/[paymentId]/print.",
    },
    { status: 410 },
  );
}
