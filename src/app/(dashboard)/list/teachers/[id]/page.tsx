import { notFound } from "next/navigation";
import TeacherProfileView, { type TeacherWithCounts } from "@/components/TeacherProfileView";

type TeacherPageProps = {
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

const SingleTeacherPage = async ({ params }: TeacherPageProps) => {
  const resolvedParams = params ? await params : {};

  const id = toSingleValue(resolvedParams.id);
  if (!id) {
    return notFound();
  }
  const [{ getServerSession }, { authOptions }, { default: prisma }] =
    await Promise.all([
      import("next-auth"),
      import("@/pages/api/auth/[...nextauth]"),
      import("@/lib/prisma"),
    ]);

  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  const teacher: TeacherWithCounts | null = await prisma.teacher.findUnique({
    where: { id },
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

  if (!teacher) {
    return notFound();
  }

  return <TeacherProfileView teacher={teacher} role={role} />;
};

export default SingleTeacherPage;
export const dynamic = "force-dynamic";
