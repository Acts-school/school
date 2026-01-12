import prisma from "@/lib/prisma";
import type {
  CbcCompetency,
  CbcCompetencyLevel,
  EducationStage,
  SloAchievementLevel,
  Term,
} from "@prisma/client";

type LearningObservationWithRubric = {
  notes: string | null;
  createdAt: Date;
  sloId: number | null;
  competency: CbcCompetency | null;
  rubricId: number | null;
  rubricCriterionId: number | null;
  rubric: {
    name: string | null;
  } | null;
  rubricCriterion: {
    level: SloAchievementLevel;
    descriptor: string;
  } | null;
};

export type CbcReportContext = {
  studentId: string;
  studentName: string;
  className: string;
  gradeLevel: number;
  stage: EducationStage | null;
  academicYear: number;
  term: Term;
};

export type CbcEvidenceSummary = {
  observationCount: number;
  lastObservationNote: string | null;
  lastObservationDate: Date | null;
  rubricBreakdown: Array<{
    rubricId: number;
    rubricName: string | null;
    rubricCriterionId: number | null;
    level: SloAchievementLevel | null;
    criterionDescriptor: string | null;
    count: number;
  }>;
};

export type CbcSloReportRow = {
  sloId: number;
  sloCode: string | null;
  sloDescription: string;
  learningAreaName: string;
  strandName: string;
  subStrandName: string;
  level: SloAchievementLevel;
  comment: string | null;
  evidence: CbcEvidenceSummary;
};

export type CbcLearningAreaReport = {
  learningAreaName: string;
  slos: CbcSloReportRow[];
};

export type CbcCompetencyReportRow = {
  competency: CbcCompetency;
  level: CbcCompetencyLevel;
  comment: string | null;
  evidence: CbcEvidenceSummary;
};

export type CbcTermReport = {
  context: CbcReportContext;
  learningAreas: CbcLearningAreaReport[];
  competencies: CbcCompetencyReportRow[];
  teacherComment: string | null;
};

export type GetCbcTermReportParams = {
  studentId: string;
  academicYear: number;
  term: Term;
};

export const getCbcTermReport = async (
  params: GetCbcTermReportParams,
): Promise<CbcTermReport | null> => {
  const { studentId, academicYear, term } = params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: {
        select: {
          name: true,
          grade: {
            select: {
              level: true,
              stage: true,
            },
          },
        },
      },
      grade: {
        select: {
          level: true,
          stage: true,
        },
      },
    },
  });

  if (!student) {
    return null;
  }

  const effectiveGradeLevel = student.grade?.level ?? student.class?.grade?.level ?? 0;
  const effectiveStage = student.grade?.stage ?? student.class?.grade?.stage ?? null;
  const className = student.class?.name ?? "";

  const context: CbcReportContext = {
    studentId: student.id,
    studentName: `${student.name} ${student.surname}`,
    className,
    gradeLevel: effectiveGradeLevel,
    stage: effectiveStage,
    academicYear,
    term,
  };

  const sloRecords = await prisma.studentSloRecord.findMany({
    where: {
      studentId,
      academicYear,
      term,
    },
    include: {
      slo: {
        include: {
          subStrand: {
            include: {
              strand: {
                include: {
                  learningArea: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      sloId: "asc",
    },
  });

  const sloIds = sloRecords.map((record) => record.sloId);

  const sloObservations: LearningObservationWithRubric[] = sloIds.length
    ? ((await prisma.learningObservation.findMany({
        where: {
          studentId,
          sloId: {
            in: sloIds,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })) as unknown as LearningObservationWithRubric[])
    : [];

  const sloEvidenceBySloId = new Map<number, CbcEvidenceSummary>();

  for (const record of sloRecords) {
    const currentSloId = record.sloId;

    if (sloEvidenceBySloId.has(currentSloId)) {
      continue;
    }

    const observationsForSlo = sloObservations.filter(
      (observation) => observation.sloId === currentSloId,
    );

    const observationCount = observationsForSlo.length;

    const lastObservation = observationsForSlo[0];

    const aggregates = new Map<
      string,
      {
        rubricId: number;
        rubricName: string | null;
        rubricCriterionId: number | null;
        level: SloAchievementLevel | null;
        criterionDescriptor: string | null;
        count: number;
      }
    >();

    for (const observation of observationsForSlo) {
      const rubricIdValue = observation.rubricId;

      if (rubricIdValue === null) {
        continue;
      }

      const criterionId = observation.rubricCriterionId;
      const key = `${rubricIdValue}:${criterionId === null ? "none" : String(criterionId)}`;

      const existing = aggregates.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }

      aggregates.set(key, {
        rubricId: rubricIdValue,
        rubricName: observation.rubric?.name ?? null,
        rubricCriterionId: criterionId,
        level: observation.rubricCriterion?.level ?? null,
        criterionDescriptor: observation.rubricCriterion?.descriptor ?? null,
        count: 1,
      });
    }

    const evidence: CbcEvidenceSummary = {
      observationCount,
      lastObservationNote: lastObservation?.notes ?? null,
      lastObservationDate: lastObservation?.createdAt ?? null,
      rubricBreakdown: Array.from(aggregates.values()),
    };

    sloEvidenceBySloId.set(currentSloId, evidence);
  }

  const learningAreaMap = new Map<string, CbcLearningAreaReport>();

  for (const record of sloRecords) {
    const slo = record.slo;
    const subStrand = slo.subStrand;
    const strand = subStrand.strand;
    const learningArea = strand.learningArea;

    const learningAreaName = learningArea.name;

    const existingArea = learningAreaMap.get(learningAreaName);

    const evidence = sloEvidenceBySloId.get(slo.id) ?? {
      observationCount: 0,
      lastObservationNote: null,
      lastObservationDate: null,
      rubricBreakdown: [],
    };

    const row: CbcSloReportRow = {
      sloId: slo.id,
      sloCode: slo.code ?? null,
      sloDescription: slo.description,
      learningAreaName,
      strandName: strand.name,
      subStrandName: subStrand.name,
      level: record.level,
      comment: record.comment ?? null,
      evidence,
    };

    if (!existingArea) {
      learningAreaMap.set(learningAreaName, {
        learningAreaName,
        slos: [row],
      });
    } else {
      existingArea.slos.push(row);
    }
  }

  const competencyRecords = await prisma.studentCompetencyRecord.findMany({
    where: {
      studentId,
      academicYear,
      term,
    },
    orderBy: {
      competency: "asc",
    },
  });

  const competencies = competencyRecords.map((record) => record.competency);

  const competencyObservations: LearningObservationWithRubric[] = competencies.length
    ? ((await prisma.learningObservation.findMany({
        where: {
          studentId,
          competency: {
            in: competencies,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })) as unknown as LearningObservationWithRubric[])
    : [];

  const competencyRows: CbcCompetencyReportRow[] = competencyRecords.map((record) => {
    const observationsForCompetency = competencyObservations.filter(
      (observation) => observation.competency === record.competency,
    );

    const observationCount = observationsForCompetency.length;
    const lastObservation = observationsForCompetency[0];

    const aggregates = new Map<
      string,
      {
        rubricId: number;
        rubricName: string | null;
        rubricCriterionId: number | null;
        level: SloAchievementLevel | null;
        criterionDescriptor: string | null;
        count: number;
      }
    >();

    for (const observation of observationsForCompetency) {
      const rubricIdValue = observation.rubricId;

      if (rubricIdValue === null) {
        continue;
      }

      const criterionId = observation.rubricCriterionId;
      const key = `${rubricIdValue}:${criterionId === null ? "none" : String(criterionId)}`;

      const existing = aggregates.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }

      aggregates.set(key, {
        rubricId: rubricIdValue,
        rubricName: observation.rubric?.name ?? null,
        rubricCriterionId: criterionId,
        level: observation.rubricCriterion?.level ?? null,
        criterionDescriptor: observation.rubricCriterion?.descriptor ?? null,
        count: 1,
      });
    }

    const evidence: CbcEvidenceSummary = {
      observationCount,
      lastObservationNote: lastObservation?.notes ?? null,
      lastObservationDate: lastObservation?.createdAt ?? null,
      rubricBreakdown: Array.from(aggregates.values()),
    };

    const row: CbcCompetencyReportRow = {
      competency: record.competency,
      level: record.level,
      comment: record.comment ?? null,
      evidence,
    };

    return row;
  });

  const report: CbcTermReport = {
    context,
    learningAreas: Array.from(learningAreaMap.values()),
    competencies: competencyRows,
    teacherComment: null,
  };

  return report;
};

export type TermAttendanceSummary = {
  daysOpen: number;
  daysPresent: number;
  daysAbsent: number;
};

export type GetTermAttendanceSummaryParams = {
  studentId: string;
  academicYear: number;
  term: Term;
};

export const getTermAttendanceSummary = async (
  params: GetTermAttendanceSummaryParams,
): Promise<TermAttendanceSummary> => {
  const { studentId, academicYear } = params;

  const startOfYear = new Date(academicYear, 0, 1);
  const startOfNextYear = new Date(academicYear + 1, 0, 1);

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      studentId,
      date: {
        gte: startOfYear,
        lt: startOfNextYear,
      },
    },
    select: {
      date: true,
      present: true,
    },
  });

  if (attendanceRecords.length === 0) {
    return {
      daysOpen: 0,
      daysPresent: 0,
      daysAbsent: 0,
    };
  }

  const byDay = new Map<
    string,
    {
      hasAnyRecord: boolean;
      hasPresentRecord: boolean;
    }
  >();

  for (const record of attendanceRecords) {
    const dateValue = record.date instanceof Date ? record.date : new Date(record.date);
    const key = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(
      dateValue.getDate(),
    ).padStart(2, "0")}`;

    const existing = byDay.get(key);

    if (!existing) {
      byDay.set(key, {
        hasAnyRecord: true,
        hasPresentRecord: record.present,
      });
      continue;
    }

    if (record.present) {
      existing.hasPresentRecord = true;
    }
  }

  let daysOpen = 0;
  let daysPresent = 0;

  byDay.forEach((entry) => {
    if (!entry.hasAnyRecord) {
      // This branch will not currently occur, but keeps the type explicit.
      // eslint-disable-next-line no-continue
      return;
    }

    daysOpen += 1;

    if (entry.hasPresentRecord) {
      daysPresent += 1;
    }
  });

  const daysAbsent = daysOpen - daysPresent;

  return {
    daysOpen,
    daysPresent,
    daysAbsent,
  };
};
