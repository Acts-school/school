import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import { getLatestStudentSloRecordsForTerm } from "@/lib/actions";
import type {
  Student,
  Term,
  CbcCompetency,
  CbcCompetencyLevel,
  StudentCompetencyRecord,
  SloAchievementLevel,
} from "@prisma/client";

const CBC_COMPETENCY_LABELS: Record<CbcCompetency, string> = {
  COMMUNICATION_COLLABORATION: "Communication & Collaboration",
  CRITICAL_THINKING_PROBLEM_SOLVING: "Critical Thinking & Problem Solving",
  IMAGINATION_CREATIVITY: "Imagination & Creativity",
  CITIZENSHIP: "Citizenship",
  DIGITAL_LITERACY: "Digital Literacy",
  LEARNING_TO_LEARN: "Learning to Learn",
  SELF_EFFICACY: "Self-Efficacy",
};

const CBC_LEVEL_LABELS: Record<CbcCompetencyLevel, string> = {
  EMERGING: "Emerging",
  DEVELOPING: "Developing",
  PROFICIENT: "Proficient",
  ADVANCED: "Advanced",
};

const SLO_LEVEL_LABELS: Record<SloAchievementLevel, string> = {
  BELOW_EXPECTATIONS: "Below expectations",
  APPROACHING_EXPECTATIONS: "Approaching expectations",
  MEETING_EXPECTATIONS: "Meeting expectations",
};

const ParentPage = async () => {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  if (!currentUserId) {
    return null;
  }

  const students: Array<Pick<Student, "id" | "name" | "surname" | "classId">> =
    await prisma.student.findMany({
      where: {
        parentId: currentUserId,
      },
    });

  const { academicYear, term } = await getSchoolSettingsDefaults();

  let snapshotsByStudent = new Map<string, StudentCompetencyRecord[]>();
  let sloSnapshotsByStudent = new Map<
    string,
    Awaited<ReturnType<typeof getLatestStudentSloRecordsForTerm>>
  >();

  if (students.length > 0) {
    const studentIds = students.map((s) => s.id);

    const allRecords = await prisma.studentCompetencyRecord.findMany({
      where: {
        studentId: { in: studentIds },
        academicYear,
        term: term as Term,
      },
      orderBy: { createdAt: "desc" },
    });

    const latestByStudentAndCompetency = new Map<
      string,
      Map<CbcCompetency, StudentCompetencyRecord>
    >();

    for (const record of allRecords) {
      let byCompetency = latestByStudentAndCompetency.get(record.studentId);
      if (!byCompetency) {
        byCompetency = new Map<CbcCompetency, StudentCompetencyRecord>();
        latestByStudentAndCompetency.set(record.studentId, byCompetency);
      }

      if (!byCompetency.has(record.competency)) {
        byCompetency.set(record.competency, record);
      }
    }

    snapshotsByStudent = new Map(
      Array.from(latestByStudentAndCompetency.entries()).map(
        ([studentId, byCompetency]) => [
          studentId,
          Array.from(byCompetency.values()).sort((a, b) =>
            a.competency.localeCompare(b.competency),
          ),
        ],
      ),
    );

    const sloSnapshotEntries = await Promise.all(
      students.map(async (student) => {
        const records = await getLatestStudentSloRecordsForTerm({
          studentId: student.id,
          academicYear,
          term: term as Term,
        });

        const snapshot = [...records]
          .sort((a, b) => {
            if (a.learningAreaName !== b.learningAreaName) {
              return a.learningAreaName.localeCompare(b.learningAreaName);
            }

            const aKey = a.sloCode ?? a.sloDescription;
            const bKey = b.sloCode ?? b.sloDescription;

            return aKey.localeCompare(bKey);
          })
          .slice(0, 8);

        return [student.id, snapshot] as const;
      }),
    );

    sloSnapshotsByStudent = new Map(sloSnapshotEntries);
  }

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="">
        {students.map((student) => (
          <div className="w-full xl:w-2/3" key={student.id}>
            <div className="h-full bg-white p-4 rounded-md">
              <h1 className="text-xl font-semibold">
                Schedule ({student.name + " " + student.surname})
              </h1>
              <BigCalendarContainer type="classId" id={student.classId} />
            </div>
          </div>
        ))}
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements />
        {students.map((student) => {
          const snapshot = snapshotsByStudent.get(student.id) ?? [];

          const sloSnapshot = sloSnapshotsByStudent.get(student.id) ?? [];

          if (snapshot.length === 0 && sloSnapshot.length === 0) {
            return null;
          }

          return (
            <div className="bg-white p-4 rounded-md" key={`${student.id}-cbc`}>
              <h2 className="text-lg font-semibold mb-3">
                CBC Overview – {student.name} {student.surname}
              </h2>
              {snapshot.length > 0 && (
                <div className="flex flex-col gap-3 text-sm">
                  {snapshot.map((record) => (
                    <div
                      key={record.competency}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {CBC_COMPETENCY_LABELS[record.competency]}
                        </div>
                        {record.comment && (
                          <div className="text-gray-500 mt-0.5">
                            {record.comment}
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap">
                        {CBC_LEVEL_LABELS[record.level]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {sloSnapshot.length > 0 && (
                <div className="flex flex-col gap-3 text-sm">
                  {sloSnapshot.map((record) => (
                    <div
                      key={record.sloId}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {record.learningAreaName}
                        </div>
                        <div className="text-gray-500 mt-0.5">
                          {record.strandName} · {record.subStrandName}
                        </div>
                        <div className="text-gray-700 mt-0.5">
                          {record.sloDescription}
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap">
                        {SLO_LEVEL_LABELS[record.level]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <a
                  href={`/api/cbc-reports/student/${student.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Print CBC report (PDF)
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParentPage;
