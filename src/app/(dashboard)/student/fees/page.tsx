import { redirect } from "next/navigation";
import MyStudentFeesClient from "@/components/MyStudentFeesClient";

const StudentFeesPage = async () => {
  const [{ getServerSession }, { authOptions }] = await Promise.all([
    import("next-auth"),
    import("@/pages/api/auth/[...nextauth]"),
  ]);

  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "student") {
    redirect("/");
  }

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">My Fees</h1>
      <MyStudentFeesClient title="My Fees" allowPayments={false} role="student" />
    </div>
  );
};

export default StudentFeesPage;
export const dynamic = "force-dynamic";
