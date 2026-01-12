import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import { getCurrentSchoolContext } from "@/lib/authz";
import type {
  CbcCompetency,
  CbcCompetencyLevel,
  SloAchievementLevel,
  StudentCompetencyRecord,
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

type CompetencyLevelCounts = {
  EMERGING: number;
  DEVELOPING: number;
  PROFICIENT: number;
  ADVANCED: number;
};

type ClassSummary = {
  classId: number;
  className: string;
  competencies: Map<CbcCompetency, CompetencyLevelCounts>;
};

const emptyCounts = (): CompetencyLevelCounts => ({
  EMERGING: 0,
  DEVELOPING: 0,
  PROFICIENT: 0,
  ADVANCED: 0,
});

type SloLevelCounts = {
	BELOW_EXPECTATIONS: number;
	APPROACHING_EXPECTATIONS: number;
	MEETING_EXPECTATIONS: number;
};

type SloClassAreaSummary = {
	classId: number;
	className: string;
	learningAreaName: string;
	counts: SloLevelCounts;
};

const emptySloCounts = (): SloLevelCounts => ({
	BELOW_EXPECTATIONS: 0,
	APPROACHING_EXPECTATIONS: 0,
	MEETING_EXPECTATIONS: 0,
});

const CbcAnalyticsPage = async () => {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session || role !== "admin") {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <p className="text-sm text-gray-700">
          CBC analytics are only available to admin users.
        </p>
      </div>
    );
  }

  const { academicYear, term } = await getSchoolSettingsDefaults();
  const { schoolId } = await getCurrentSchoolContext();

  const records = await prisma.studentCompetencyRecord.findMany({
    where: {
      academicYear,
      term,
      ...(schoolId !== null
        ? { student: { class: { schoolId } } as unknown as Record<string, unknown> }
        : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          surname: true,
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const sloRecords = await prisma.studentSloRecord.findMany({
		where: {
			academicYear,
			term,
			...(schoolId !== null
				? { student: { class: { schoolId } } as unknown as Record<string, unknown> }
				: {}),
		},
		include: {
			student: {
				select: {
					class: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			},
			slo: {
				select: {
					subStrand: {
						select: {
							strand: {
								select: {
									learningArea: {
										select: {
											name: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});

  const summariesByClass = new Map<number, ClassSummary>();

  for (const record of records) {
    const classInfo = record.student.class;
    if (!classInfo) continue;

    let summary = summariesByClass.get(classInfo.id);
    if (!summary) {
      summary = {
        classId: classInfo.id,
        className: classInfo.name,
        competencies: new Map<CbcCompetency, CompetencyLevelCounts>(),
      };
      summariesByClass.set(classInfo.id, summary);
    }

    let counts = summary.competencies.get(record.competency);
    if (!counts) {
      counts = emptyCounts();
      summary.competencies.set(record.competency, counts);
    }

    counts[record.level] += 1;
  }

  const classSummaries: Array<{
    classId: number;
    className: string;
    competency: CbcCompetency;
    counts: CompetencyLevelCounts;
  }> = [];

  for (const summary of Array.from(summariesByClass.values()).sort((a, b) =>
    a.className.localeCompare(b.className),
  )) {
    summary.competencies.forEach((counts, competency) => {
      classSummaries.push({
        classId: summary.classId,
        className: summary.className,
        competency,
        counts,
      });
    });
  }

  const supportByStudent = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      className: string;
      emergingCount: number;
    }
  >();

  for (const record of records) {
    const studentInfo = record.student;
    const classInfo = studentInfo?.class;
    if (!studentInfo || !classInfo) {
      continue;
    }

    if (record.level !== "EMERGING") {
      continue;
    }

    const fullName = `${studentInfo.name} ${studentInfo.surname}`.trim();
    const existing = supportByStudent.get(record.student.id);

    if (!existing) {
      supportByStudent.set(record.student.id, {
        studentId: record.student.id,
        studentName: fullName,
        className: classInfo.name,
        emergingCount: 1,
      });
    } else {
      existing.emergingCount += 1;
    }
  }

  const studentsNeedingSupport = Array.from(supportByStudent.values())
    .filter((item) => item.emergingCount >= 2)
    .sort((a, b) => {
      if (b.emergingCount !== a.emergingCount) {
        return b.emergingCount - a.emergingCount;
      }
      return a.studentName.localeCompare(b.studentName);
    });

	const sloSummariesByClassAndArea = new Map<string, SloClassAreaSummary>();

	for (const record of sloRecords) {
		const classInfo = record.student.class;
		if (!classInfo) {
			continue;
		}

		const learningAreaName =
			record.slo.subStrand.strand.learningArea.name;
		const key = `${classInfo.id}|${learningAreaName}`;

		let summary = sloSummariesByClassAndArea.get(key);
		if (!summary) {
			summary = {
				classId: classInfo.id,
				className: classInfo.name,
				learningAreaName,
				counts: emptySloCounts(),
			};
			sloSummariesByClassAndArea.set(key, summary);
		}

		summary.counts[record.level] += 1;
	}

	const sloClassSummaries: SloClassAreaSummary[] = Array.from(
		sloSummariesByClassAndArea.values(),
	).sort((a, b) => {
		if (a.className !== b.className) {
			return a.className.localeCompare(b.className);
		}
		return a.learningAreaName.localeCompare(b.learningAreaName);
	});

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">CBC Analytics  Current Term</h1>
          <p className="text-xs text-gray-500">
            Academic year {academicYear}, term {term}
          </p>
        </div>
      </div>

      {classSummaries.length === 0 ? (
        <p className="text-sm text-gray-600">
          No CBC competency records found for the current term.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Competency
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                    Emerging
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                    Developing
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                    Proficient
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                    Advanced
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classSummaries.map((row) => (
                  <tr key={`${row.classId}-${row.competency}`}>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                      {row.className}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                      {CBC_COMPETENCY_LABELS[row.competency]}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">
                      {row.counts.EMERGING}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">
                      {row.counts.DEVELOPING}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">
                      {row.counts.PROFICIENT}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">
                      {row.counts.ADVANCED}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {studentsNeedingSupport.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-700">
                Students needing support (current term)
              </h2>
              <p className="text-xs text-gray-500 mb-2">
                Learners with two or more Emerging ratings across competencies.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                        Emerging count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentsNeedingSupport.map((item) => (
                      <tr key={item.studentId}>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                          <div>{item.studentName}</div>
                          <div>
                            <a
                              href={`/api/cbc-reports/student/${item.studentId}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-600 hover:underline"
                            >
                              Print CBC report (PDF)
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                          {item.className}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">
                          {item.emergingCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

			{sloClassSummaries.length > 0 && (
				<div className="mt-6">
					<h2 className="text-sm font-semibold text-gray-700">
						SLO Analytics (current term)
					</h2>
					<p className="text-xs text-gray-500 mb-2">
						Distribution of SLO levels by class and learning area.
					</p>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 text-xs">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Class
									</th>
									<th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Learning area
									</th>
									<th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
										Below expectations
									</th>
									<th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
										Approaching expectations
									</th>
									<th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
										Meeting expectations
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{sloClassSummaries.map((row) => (
									<tr
										key={`${row.classId}-${row.learningAreaName}`}
									>
										<td className="px-4 py-2 whitespace-nowrap text-gray-900">
											{row.className}
										</td>
										<td className="px-4 py-2 whitespace-nowrap text-gray-900">
											{row.learningAreaName}
										</td>
										<td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">
											{row.counts.BELOW_EXPECTATIONS}
										</td>
										<td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">
											{row.counts.APPROACHING_EXPECTATIONS}
										</td>
										<td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">
											{row.counts.MEETING_EXPECTATIONS}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
        </>
      )}
    </div>
  );
};

export default CbcAnalyticsPage;
