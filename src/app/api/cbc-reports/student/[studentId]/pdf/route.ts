import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import {
  CbcTermReportDocument,
} from "@/lib/pdf/CbcTermReportDocument";
import {
  getCbcTermReport,
  getTermAttendanceSummary,
} from "@/lib/cbcReports";
import { renderToBuffer } from "@react-pdf/renderer";

const paramsSchema = z.object({
  studentId: z.string(),
});

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
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await context.params;

  const parsedParams = paramsSchema.safeParse({
    studentId: toSingleValue(resolvedParams.studentId),
  });
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }

  const { studentId } = parsedParams.data;

  const role = session.user.role;
  const userId = session.user.id;

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        parentId: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (role === "student" && student.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (role === "parent" && student.parentId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (role !== "admin" && role !== "teacher" && role !== "parent" && role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { academicYear, term } = await getSchoolSettingsDefaults();

    const report = await getCbcTermReport({
      studentId,
      academicYear,
      term,
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const attendance = await getTermAttendanceSummary({
      studentId,
      academicYear,
      term,
    });

    const settings = await prisma.schoolSettings.findUnique({ where: { id: 1 } });
    const schoolName = settings?.schoolName ?? "School";

    const element = CbcTermReportDocument({
      report,
      attendance,
      schoolName,
      systemName: "School Management System",
    });

    const buffer = await renderToBuffer(element);
    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=cbc-report-${studentId}-${term}-${academicYear}.pdf`,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error generating CBC term report PDF:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
