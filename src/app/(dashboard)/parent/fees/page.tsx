import { redirect } from "next/navigation";
import ParentFeesClient from "@/components/ParentFeesClient";

const ParentFeesPage = async () => {
  const [{ getServerSession }, { authOptions }, { default: prisma }] =
    await Promise.all([
      import("next-auth"),
      import("@/pages/api/auth/[...nextauth]"),
      import("@/lib/prisma"),
    ]);

  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "parent") {
    redirect("/");
  }

  const userId = session.user.id;

  const students = await prisma.student.findMany({
    where: { parentId: userId },
    select: { id: true, name: true, surname: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Children&apos;s Fees</h1>
      <ParentFeesClient
        students={students.map((s) => ({ id: s.id, name: s.name, surname: s.surname }))}
      />
    </div>
  );
};

export default ParentFeesPage;
export const dynamic = "force-dynamic";
