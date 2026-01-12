import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import ProfileForm, { type ProfileFormInput } from "@/components/forms/ProfileForm";
import PreferencesForm, {
  type PreferencesFormInput,
} from "@/components/forms/PreferencesForm";
import TeacherProfileView, { type TeacherWithCounts } from "@/components/TeacherProfileView";
import StudentProfileView, {
  type RecentResultRow,
  type ResultsSummary,
  type StudentWithClassCounts,
} from "@/components/StudentProfileView";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Profile</h1>
        <div className="text-sm text-gray-500">No user session found.</div>
      </div>
    );
  }

  const { id: userId, role } = user as { id: string; role?: string };

  if (role === "teacher") {
    const teacher: TeacherWithCounts | null = await prisma.teacher.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            subjects: true,
            lessons: true,
            classes: true,
          },
        },
      },
    });

    if (teacher) {
      return <TeacherProfileView teacher={teacher} role={role} />;
    }
  }

  if (role === "student") {
    const student = await prisma.student.findUnique({
      where: { id: userId },
      include: {
        class: { include: { _count: { select: { lessons: true } } } },
      },
    });

    if (!student) {
      redirect("/");
    }

    const { passingScore, academicYear, term } = await getSchoolSettingsDefaults();

    const rawResults = await prisma.result.findMany({
      where: { studentId: userId },
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
  }

  if (role === "parent") {
    redirect("/parent");
  }

  let profileData: ProfileFormInput | null = null;

  const themeFromEnum = (theme: string): PreferencesFormInput["theme"] => {
    if (theme === "LIGHT") {
      return "light";
    }
    if (theme === "DARK") {
      return "dark";
    }
    return "system";
  };

  let preferences: PreferencesFormInput = { theme: "system" };

  if (role) {
    const existingPreferences = await prisma.userPreference.findUnique({
      where: {
        userId_role: {
          userId,
          role,
        },
      },
    });

    if (existingPreferences) {
      preferences = {
        theme: themeFromEnum(existingPreferences.theme),
      };
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Profile</h1>
      {profileData ? (
        <div className="bg-white p-4 rounded-md shadow-sm max-w-xl">
          <ProfileForm initialData={profileData} roleLabel={role ?? ""} />
        </div>
      ) : (
        <div className="bg-white p-4 rounded-md shadow-sm max-w-md">
          <div className="flex flex-col gap-2 text-sm">
            <div>
              <span className="font-medium">Name: </span>
              <span>{user.name}</span>
            </div>
            <div>
              <span className="font-medium">Email: </span>
              <span>{user.email}</span>
            </div>
            <div>
              <span className="font-medium">Role: </span>
              <span>{role}</span>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white p-4 rounded-md shadow-sm max-w-xl">
        <h2 className="text-lg font-semibold mb-2">Preferences</h2>
        <p className="text-sm text-gray-500 mb-4">
          Choose how the dashboard theme should behave for your account.
        </p>
        <PreferencesForm initialData={preferences} />
      </div>
    </div>
  );
}
