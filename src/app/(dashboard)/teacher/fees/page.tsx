import { redirect } from "next/navigation";
import MyStudentFeesClient from "@/components/MyStudentFeesClient";

const TeacherFeesPage = async () => {
  const [{ getServerSession }, { authOptions }] = await Promise.all([
    import("next-auth"),
    import("@/pages/api/auth/[...nextauth]"),
  ]);

  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/");
  }

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Students&apos; Fees</h1>
      <MyStudentFeesClient title="Students&apos; Fees" allowPayments={false} role="teacher" />
    </div>
  );
};

export default TeacherFeesPage;
export const dynamic = "force-dynamic";
