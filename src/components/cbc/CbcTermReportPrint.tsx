import type { CbcTermReport, TermAttendanceSummary } from "@/lib/cbcReports";

export type CbcTermReportPrintProps = {
  report: CbcTermReport;
  attendance: TermAttendanceSummary;
  schoolName: string;
  systemName: string;
};

export function CbcTermReportPrint({
  report,
  attendance,
  schoolName,
  systemName,
}: CbcTermReportPrintProps) {
  const { context, learningAreas, competencies, teacherComment } = report;

  const learnerName = context.studentName;
  const gradeClass = `Grade ${context.gradeLevel} · ${context.className}`;
  const termYear = `${context.term} ${context.academicYear}`;

  return (
    <div className="w-full max-w-3xl mx-auto bg-white text-gray-900 p-8 text-sm">
      <header className="border-b border-gray-200 pb-3 mb-4">
        <div className="text-center">
          <div className="text-xl font-semibold">{schoolName}</div>
          <div className="text-xs text-gray-600">CBC School Based Assessment</div>
          <div className="text-sm font-semibold mt-1">
            CBC END-OF-TERM LEARNER PROGRESS REPORT
          </div>
        </div>
      </header>

      <section className="mb-4 bg-gray-50 rounded border border-gray-200 p-3 text-xs">
        <div className="flex justify-between mb-1">
          <div className="w-1/2 pr-2">
            <div className="font-semibold">Learner Name</div>
            <div>{learnerName}</div>
          </div>
          <div className="w-1/2 pl-2">
            <div className="font-semibold">Admission No / UPI</div>
            <div>-</div>
          </div>
        </div>
        <div className="flex justify-between mb-1">
          <div className="w-1/2 pr-2">
            <div className="font-semibold">Grade / Class</div>
            <div>{gradeClass}</div>
          </div>
          <div className="w-1/2 pl-2">
            <div className="font-semibold">Term &amp; Year</div>
            <div>{termYear}</div>
          </div>
        </div>
        <div className="flex justify-between mb-1">
          <div className="w-1/2 pr-2">
            <div className="font-semibold">Age</div>
            <div>-</div>
          </div>
          <div className="w-1/2 pl-2">
            <div className="font-semibold">Gender</div>
            <div>-</div>
          </div>
        </div>
        <div className="flex justify-between">
          <div className="w-1/2 pr-2">
            <div className="font-semibold">Class Teacher</div>
            <div>-</div>
          </div>
          <div className="w-1/2 pl-2">
            <div className="font-semibold">Stage</div>
            <div>{context.stage ?? "-"}</div>
          </div>
        </div>
      </section>

      <section className="mb-4">
        <div className="text-xs font-semibold uppercase text-gray-700 mb-1">
          Learning Areas
        </div>
        <div className="border-b border-gray-200 mb-2" />
        <table className="w-full border border-gray-200 text-xs border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-gray-200 px-2 py-1 text-left w-1/3">
                Learning Area
              </th>
              <th className="border border-gray-200 px-2 py-1 text-center w-8">E</th>
              <th className="border border-gray-200 px-2 py-1 text-center w-8">AE</th>
              <th className="border border-gray-200 px-2 py-1 text-center w-8">ME</th>
              <th className="border border-gray-200 px-2 py-1 text-center w-8">EE</th>
              <th className="border border-gray-200 px-2 py-1 text-left">Teacher Comment</th>
            </tr>
          </thead>
          <tbody>
            {learningAreas.map((area) => (
              <tr key={area.learningAreaName} className="align-top">
                <td className="border border-gray-200 px-2 py-1">
                  {area.learningAreaName}
                </td>
                <td className="border border-gray-200 px-2 py-1 text-center" />
                <td className="border border-gray-200 px-2 py-1 text-center" />
                <td className="border border-gray-200 px-2 py-1 text-center" />
                <td className="border border-gray-200 px-2 py-1 text-center" />
                <td className="border border-gray-200 px-2 py-1" />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-4">
        <div className="text-xs font-semibold uppercase text-gray-700 mb-1">
          Core Competencies
        </div>
        <div className="border-b border-gray-200 mb-2" />
        <table className="w-full border border-gray-200 text-xs border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-gray-200 px-2 py-1 text-left">
                Competency
              </th>
              <th className="border border-gray-200 px-2 py-1 text-center w-8">E</th>
              <th className="border border-gray-200 px-2 py-1 text-center w-8">AE</th>
              <th className="border border-gray-200 px-2 py-1 text-center w-8">ME</th>
              <th className="border border-gray-200 px-2 py-1 text-center w-8">EE</th>
            </tr>
          </thead>
          <tbody>
            {competencies.map((row) => (
              <tr key={row.competency} className="align-top">
                <td className="border border-gray-200 px-2 py-1">
                  {row.competency}
                </td>
                <td className="border border-gray-200 px-2 py-1 text-center" />
                <td className="border border-gray-200 px-2 py-1 text-center" />
                <td className="border border-gray-200 px-2 py-1 text-center" />
                <td className="border border-gray-200 px-2 py-1 text-center" />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-4">
        <div className="text-xs font-semibold uppercase text-gray-700 mb-1">
          Teacher&apos;s Overall Comment
        </div>
        <div className="border-b border-gray-200 mb-2" />
        <div className="border border-gray-200 min-h-[72px] p-2 text-xs">
          {teacherComment ?? ""}
        </div>
      </section>

      <section className="mb-4">
        <div className="text-xs font-semibold uppercase text-gray-700 mb-1">
          Head Teacher&apos;s Comment
        </div>
        <div className="border-b border-gray-200 mb-2" />
        <div className="border border-gray-200 min-h-[72px] p-2 text-xs" />
      </section>

      <section className="mb-4">
        <div className="text-xs font-semibold uppercase text-gray-700 mb-1">
          Attendance Summary
        </div>
        <div className="border-b border-gray-200 mb-2" />
        <div className="border border-gray-200 flex text-xs">
          <div className="flex-1 border-r border-gray-200 px-2 py-1">
            Days Open
          </div>
          <div className="w-16 text-right px-2 py-1">{attendance.daysOpen}</div>
          <div className="flex-1 border-l border-gray-200 px-2 py-1">
            Days Present
          </div>
          <div className="w-16 text-right px-2 py-1">{attendance.daysPresent}</div>
          <div className="flex-1 border-l border-gray-200 px-2 py-1">
            Days Absent
          </div>
          <div className="w-16 text-right px-2 py-1">{attendance.daysAbsent}</div>
        </div>
      </section>

      <section className="mb-8">
        <div className="text-xs font-semibold uppercase text-gray-700 mb-1">
          Signatures
        </div>
        <div className="border-b border-gray-200 mb-2" />
        <div className="flex gap-4 text-xs">
          <div className="flex-1">
            <div className="font-semibold mb-1">Class Teacher</div>
            <div className="border border-gray-200 p-2 min-h-[80px]">
              <div>Name: ________________________</div>
              <div>Signature: ____________________</div>
              <div>Date: ________________________</div>
            </div>
          </div>
          <div className="flex-1">
            <div className="font-semibold mb-1">Head Teacher</div>
            <div className="border border-gray-200 p-2 min-h-[80px]">
              <div>Name: ________________________</div>
              <div>Signature: ____________________</div>
              <div>Date: ________________________</div>
            </div>
          </div>
          <div className="flex-1">
            <div className="font-semibold mb-1">School Stamp</div>
            <div className="border border-gray-200 p-2 min-h-[80px] flex items-center justify-center">
              <span>Stamp</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-4 text-[10px] text-gray-500 flex justify-between">
        <span>Generated by {systemName}</span>
        <span>CBC – School Based Assessment</span>
        <span />
      </footer>
    </div>
  );
}
