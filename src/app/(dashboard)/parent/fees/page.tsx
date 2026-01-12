import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ParentFeesClient from "@/components/ParentFeesClient";

const ParentFeesPage = async () => {
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
