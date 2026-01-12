import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getCurrentSchoolContext } from "@/lib/authz";

const Announcements = async () => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  const roleConditions = {
    teacher: { lessons: { some: { teacherId: userId! } } },
    student: { students: { some: { id: userId! } } },
    parent: { students: { some: { parentId: userId! } } },
  };

  const where: Prisma.AnnouncementWhereInput = {};

  if (role && role !== "admin" && userId) {
    const classCondition = roleConditions[role as keyof typeof roleConditions];

    if (classCondition) {
      where.OR = [
        { classId: null },
        { class: classCondition },
      ];
    }
  }

  const { schoolId } = await getCurrentSchoolContext();

  if (schoolId !== null) {
    const schoolOr: Prisma.AnnouncementWhereInput[] = [
      { classId: null },
      {
        class: {
          is: { schoolId },
        } as Prisma.ClassNullableRelationFilter,
      },
    ];

    if (where.OR) {
      const existingOr = where.OR;
      delete (where as { OR?: unknown }).OR;
      where.AND = [
        { OR: existingOr },
        { OR: schoolOr },
      ];
    } else {
      where.OR = schoolOr;
    }
  }

  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: { date: "desc" },
    where,
  });

  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <span className="text-xs text-gray-400">View All</span>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        {data[0] && (
          <div className="bg-lamaSkyLight rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{data[0].title}</h2>
              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(data[0].date)}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{data[0].description}</p>
          </div>
        )}
        {data[1] && (
          <div className="bg-lamaPurpleLight rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{data[1].title}</h2>
              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(data[1].date)}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{data[1].description}</p>
          </div>
        )}
        {data[2] && (
          <div className="bg-lamaYellowLight rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{data[2].title}</h2>
              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(data[2].date)}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{data[2].description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
