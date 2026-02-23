import { CbcTermReportPrint } from "@/components/cbc/CbcTermReportPrint";
import { PrintReceiptToolbar } from "@/components/finance/PrintReceiptToolbar";

import type { CbcTermReport, TermAttendanceSummary } from "@/lib/cbcReports";

type RouteParams = {
  studentId: string | string[] | undefined;
};

type PageProps = {
  params?: Promise<RouteParams>;
};

const toSingleValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export default async function CbcReportPrintPage({ params }: PageProps) {
  // Import auth, Prisma, and data helpers at runtime to avoid touching DB/env at build time
  const [
    { getServerSession },
    { authOptions },
    { default: prisma },
    { getSchoolSettingsDefaults },
    { getCbcTermReport, getTermAttendanceSummary },
  ] = await Promise.all([
    import("next-auth"),
    import("@/pages/api/auth/[...nextauth]"),
    import("@/lib/prisma"),
    import("@/lib/schoolSettings"),
    import("@/lib/cbcReports"),
  ]);

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="p-4 text-sm text-red-600">You must be signed in to view this report.</div>
    );
  }

  const resolvedParams = params ? await params : { studentId: undefined };
  const studentIdRaw = toSingleValue(resolvedParams.studentId);

  if (!studentIdRaw) {
    return (
      <div className="p-4 text-sm text-red-600">Missing student id.</div>
    );
  }

  const role = session.user.role;
  const userId = session.user.id;

  const student = await prisma.student.findUnique({
    where: { id: studentIdRaw },
    select: {
      id: true,
      parentId: true,
    },
  });

  if (!student) {
    return (
      <div className="p-4 text-sm text-red-600">Student not found.</div>
    );
  }

  if (role === "student" && student.id !== userId) {
    return (
      <div className="p-4 text-sm text-red-600">You are not allowed to view this report.</div>
    );
  }

  if (role === "parent" && student.parentId !== userId) {
    return (
      <div className="p-4 text-sm text-red-600">You are not allowed to view this report.</div>
    );
  }

  if (role !== "admin" && role !== "teacher" && role !== "parent" && role !== "student") {
    return (
      <div className="p-4 text-sm text-red-600">You are not allowed to view this report.</div>
    );
  }

  const { academicYear, term } = await getSchoolSettingsDefaults();

  const report: CbcTermReport | null = await getCbcTermReport({
    studentId: studentIdRaw,
    academicYear,
    term,
  });

  if (!report) {
    return (
      <div className="p-4 text-sm text-red-600">CBC term report not found for this learner.</div>
    );
  }

  const attendance: TermAttendanceSummary = await getTermAttendanceSummary({
    studentId: studentIdRaw,
    academicYear,
    term,
  });

  const settings = await prisma.schoolSettings.findUnique({ where: { id: 1 } });
  const schoolName = settings?.schoolName ?? "School";
  const systemName = "School Management System";

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background-color: white;
          }

          .no-print {
            display: none;
          }
        }
      `}</style>
      <PrintReceiptToolbar />
      <div className="p-4">
        <CbcTermReportPrint
          report={report}
          attendance={attendance}
          schoolName={schoolName}
          systemName={systemName}
        />
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
