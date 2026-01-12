import { NextRequest, NextResponse } from "next/server";

import type { Term } from "@prisma/client";
import { getCbcTermReport } from "@/lib/cbcReports";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const studentId = searchParams.get("studentId");
    const academicYearParam = searchParams.get("academicYear");
    const termParam = searchParams.get("term");

    if (!studentId || !academicYearParam || !termParam) {
      return NextResponse.json({ error: "Missing required query parameters" }, {
        status: 400,
      });
    }

    const academicYear = Number.parseInt(academicYearParam, 10);
    if (!Number.isFinite(academicYear)) {
      return NextResponse.json({ error: "Invalid academicYear" }, { status: 400 });
    }

    const termValue = termParam as Term;
    if (termValue !== "TERM1" && termValue !== "TERM2" && termValue !== "TERM3") {
      return NextResponse.json({ error: "Invalid term" }, { status: 400 });
    }

    const report = await getCbcTermReport({
      studentId,
      academicYear,
      term: termValue,
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error generating CBC term report", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
