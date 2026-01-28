import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

type RouteParams = {
  studentId: string | string[] | undefined;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

const toSingleValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export async function GET(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const resolvedParams = await context.params;
  const studentIdRaw = toSingleValue(resolvedParams.studentId);

  if (!studentIdRaw) {
    return NextResponse.json({ error: "Missing student id" }, { status: 400 });
  }

  const host = req.headers.get("host");

  if (!host) {
    return NextResponse.json({ error: "Missing host header" }, { status: 500 });
  }

  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";

  const targetUrl = `${protocol}://${host}/cbc-reports/student/${encodeURIComponent(studentIdRaw)}/print`;

  const cookies = req.headers.get("cookie");

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext(
      cookies
        ? {
            extraHTTPHeaders: {
              cookie: cookies,
            },
          }
        : undefined,
    );

    const page = await context.newPage();

    const gotoResponse = await page.goto(targetUrl, {
      waitUntil: "networkidle",
    });

    if (!gotoResponse || !gotoResponse.ok()) {
      const statusCode = gotoResponse?.status() ?? 502;
      return NextResponse.json(
        { error: "Failed to load CBC report print page", status: statusCode },
        { status: 502 },
      );
    }

    await page.emulateMedia({ media: "print" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    const pdfBytes = new Uint8Array(pdfBuffer);

    const fileName = `cbc-report-${encodeURIComponent(studentIdRaw)}.pdf`;

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error generating CBC report PDF via Playwright", error);
    return NextResponse.json({ error: "Failed to generate CBC report PDF" }, { status: 500 });
  } finally {
    await browser.close();
  }
}
