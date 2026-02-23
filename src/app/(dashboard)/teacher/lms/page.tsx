import TeacherLmsDashboardClient from "@/components/TeacherLmsDashboardClient";

const TeacherLmsPage = async () => {
    const [
        { getServerSession },
        { authOptions },
        { getSchoolSettingsDefaults },
    ] = await Promise.all([
        import("next-auth"),
        import("@/pages/api/auth/[...nextauth]"),
        import("@/lib/schoolSettings"),
    ]);

    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    const userId = session?.user?.id;
    const teacherName: string =
        typeof session?.user?.name === "string" && session.user.name.length > 0
            ? session.user.name
            : "Teacher";

    if (!session || role !== "teacher" || !userId) {
        return (
            <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
                <p className="text-sm text-gray-700">
                    The Teaching Hub is only available to teachers.
                </p>
            </div>
        );
    }

    const { academicYear, term } = await getSchoolSettingsDefaults();

    return (
        <div className="flex-1 p-4">
            <TeacherLmsDashboardClient
                teacherId={userId}
                teacherName={teacherName}
                term={term}
                academicYear={academicYear}
                defaultAcademicYear={academicYear}
                defaultTerm={term}
            />
        </div>
    );
};

export default TeacherLmsPage;
export const dynamic = "force-dynamic";
