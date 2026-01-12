import StudentProfileView, {
  type RecentResultRow,
  type ResultsSummary,
  type StudentWithClassCounts,
} from "@/components/StudentProfileView";
import prisma from "@/lib/prisma";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { notFound } from "next/navigation";

type StudentPageProps = {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const toSingleValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const SingleStudentPage = async ({ params }: StudentPageProps) => {
  const resolvedParams = params ? await params : {};

  const id = toSingleValue(resolvedParams.id);
  if (!id) {
    return notFound();
  }
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: { include: { _count: { select: { lessons: true } } } },
    },
  });

  if (!student) {
    return notFound();
  }

  const { passingScore, academicYear, term } = await getSchoolSettingsDefaults();

  const rawResults = await prisma.result.findMany({
    where: { studentId: id },
    include: {
      exam: {
        include: {
          lesson: {
            include: {
              subject: true,
            },
          },
        },
      },
      assignment: {
        include: {
          lesson: {
            include: {
              subject: true,
            },
          },
        },
      },
    },
  });

  const recentResults: RecentResultRow[] = rawResults
    .map((item) => {
      const assessment = item.exam ?? item.assignment;

      if (!assessment) return null;

      const isExam = "startTime" in assessment;
      const date = isExam ? assessment.startTime : assessment.startDate;
      const subjectName = assessment.lesson.subject?.name ?? "Unknown subject";

      const isBelowPassing =
        typeof passingScore === "number" && !Number.isNaN(passingScore)
          ? item.score < passingScore
          : false;

      return {
        id: item.id,
        title: assessment.title,
        subjectName,
        score: item.score,
        date,
        isBelowPassing,
      } satisfies RecentResultRow | null;
    })
    .filter((row): row is RecentResultRow => row !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const resultsSummary: ResultsSummary = recentResults.reduce(
    (acc, row) => {
      acc.total += 1;
      acc.totalScore += row.score;
      if (!row.isBelowPassing) {
        acc.passing += 1;
      }
      return acc;
    },
    { total: 0, passing: 0, totalScore: 0 },
  );

  const averageScore =
    resultsSummary.total > 0 ? resultsSummary.totalScore / resultsSummary.total : null;

  return (
    <StudentProfileView
      student={student as StudentWithClassCounts}
      role={role}
      term={term}
      academicYear={academicYear}
      passingScore={passingScore}
      recentResults={recentResults}
      resultsSummary={resultsSummary}
      averageScore={averageScore}
    />
  );
};

export default SingleStudentPage;
