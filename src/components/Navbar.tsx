import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentSchoolContext } from "@/lib/authz";
import LogoutButton from "./LogoutButton";
import SchoolSwitcher from "./SchoolSwitcher";

type NavbarSchoolRow = {
  id: number;
  name: string | null;
};

type NavbarSchoolUserRow = {
  school: NavbarSchoolRow | null;
};

type NavbarPrisma = {
  schoolUser: {
    findMany: (args: {
      where: { userId: string };
      include: { school: { select: { id: true; name: true } } };
    }) => Promise<NavbarSchoolUserRow[]>;
  };
};

const navbarPrisma = prisma as unknown as NavbarPrisma;

const buildAnnouncementWhere = (
  role: string | undefined,
  userId: string | undefined,
): Prisma.AnnouncementWhereInput => {
  const where: Prisma.AnnouncementWhereInput = {};

  if (!role || !userId || role === "admin") {
    return where;
  }

  const roleConditions: Record<"teacher" | "student" | "parent", Prisma.ClassWhereInput> = {
    teacher: { lessons: { some: { teacherId: userId } } },
    student: { students: { some: { id: userId } } },
    parent: { students: { some: { parentId: userId } } },
  };

  const roleKey = role as keyof typeof roleConditions;
  const classCondition = roleConditions[roleKey];

  if (!classCondition) {
    return where;
  }

  where.OR = [{ classId: null }, { class: classCondition }];
  return where;
};

const Navbar = async () => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  const where = buildAnnouncementWhere(role, userId);

  const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

  let schools: { id: number; name: string }[] = [];

  if (userId) {
    const memberships = await navbarPrisma.schoolUser.findMany({
      where: { userId },
      include: { school: { select: { id: true, name: true } } },
    });

    schools = memberships
      .map((m): NavbarSchoolRow | null => m.school)
      .filter(
        (s): s is { id: number; name: string } => s !== null,
      );
  }

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
  const announcementsCount = await prisma.announcement.count({ where });
  
  return (
    <div className="flex items-center justify-between p-4">
      {/* SEARCH BAR */}
      <div className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
        <Image src="/search.png" alt="" width={14} height={14} />
        <input
          type="text"
          placeholder="Search..."
          className="w-[200px] p-2 bg-transparent outline-none"
        />
      </div>
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        {schools.length > 0 && (
          <SchoolSwitcher
            schools={schools}
            currentSchoolId={schoolId}
            isSuperAdmin={isSuperAdmin}
          />
        )}
        <Link
          href="/list/messages"
          className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer"
        >
          <Image src="/message.png" alt="" width={20} height={20} />
        </Link>
        <Link
          href="/list/announcements"
          className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative"
        >
          <Image src="/announcement.png" alt="" width={20} height={20} />
          {announcementsCount > 0 && (
            <div className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs">
              {announcementsCount}
            </div>
          )}
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-2"
        >
          <div className="flex flex-col">
            <span className="text-xs leading-3 font-medium">{session?.user?.name}</span>
            <span className="text-[10px] text-gray-500 text-right">
              {session?.user?.role}
            </span>
          </div>
          <Image src="/avatar.png" alt="" width={36} height={36} className="rounded-full"/>
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
;

export default Navbar;
