import prisma from "@/lib/prisma";
import { getCurrentSchoolContext } from "@/lib/authz";
import Image from "next/image";

type UserCardType = "admin" | "teacher" | "student" | "parent";

const UserCard = async ({
  type,
}: {
  type: UserCardType;
}) => {
  const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

  let data = 0;

  if (schoolId !== null) {
    switch (type) {
      case "admin": {
        data = await prisma.schoolUser.count({
          where: {
            schoolId,
            role: {
              in: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
            },
          },
        });
        break;
      }
      case "teacher": {
        data = await prisma.teacher.count({
          where: {
            OR: [
              {
                classes: {
                  some: { schoolId },
                },
              },
              {
                lessons: {
                  some: {
                    class: {
                      schoolId,
                    },
                  },
                },
              },
            ],
          },
        });
        break;
      }
      case "student": {
        data = await prisma.student.count({
          where: {
            class: {
              schoolId,
            },
          },
        });
        break;
      }
      case "parent": {
        data = await prisma.parent.count({
          where: {
            students: {
              some: {
                class: {
                  schoolId,
                },
              },
            },
          },
        });
        break;
      }
      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`Unsupported user card type: ${_exhaustiveCheck}`);
      }
    }
  } else if (isSuperAdmin) {
    switch (type) {
      case "admin": {
        data = await prisma.admin.count();
        break;
      }
      case "teacher": {
        data = await prisma.teacher.count();
        break;
      }
      case "student": {
        data = await prisma.student.count();
        break;
      }
      case "parent": {
        data = await prisma.parent.count();
        break;
      }
      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`Unsupported user card type: ${_exhaustiveCheck}`);
      }
    }
  }

  return (
    <div className="rounded-2xl odd:bg-lamaPurple even:bg-lamaYellow p-4 flex-1 min-w-[130px]">
      <div className="flex justify-between items-center">
        <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">
          2025/26
        </span>
        <Image src="/more.png" alt="" width={20} height={20} />
      </div>
      <h1 className="text-2xl font-semibold my-4">{data}</h1>
      <h2 className="capitalize text-sm font-medium text-gray-500">{type}s</h2>
    </div>
  );
};

export default UserCard;

