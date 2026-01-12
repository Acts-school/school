import { getServerSession } from "next-auth";

import TeacherSloManagement from "@/components/TeacherSloManagement";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";

const TeacherSloPage = async () => {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const userId = session?.user?.id;

  if (!session || role !== "teacher" || !userId) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <p className="text-sm text-gray-700">
          CBC SLOs can only be recorded by teachers.
        </p>
      </div>
    );
  }

  const { academicYear, term } = await getSchoolSettingsDefaults();

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <TeacherSloManagement
        teacherId={userId}
        defaultAcademicYear={academicYear}
        defaultTerm={term}
      />
    </div>
  );
};

export default TeacherSloPage;
