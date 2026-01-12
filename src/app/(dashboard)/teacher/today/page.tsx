import { getServerSession } from "next-auth";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import TeacherTodayLessons from "@/components/TeacherTodayLessons";

const TeacherTodayPage = async () => {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const userId = session?.user?.id;

  if (!session || role !== "teacher" || !userId) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <p className="text-sm text-gray-700">Daily CBC observations are only available to teachers.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <TeacherTodayLessons teacherId={userId} />
    </div>
  );
};

export default TeacherTodayPage;
