import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import Image from "next/image";
import Link from "next/link";
import { getCurrentSchoolContext } from "@/lib/authz-desktop";
import { isDesktopRuntime } from "@/server/runtime";
import { getSqliteDb } from "@/server/sqliteDb";
import LogoutButton from "./LogoutButton";
import SchoolSwitcher from "./SchoolSwitcher";

type NavbarSchoolRow = {
  id: number;
  name: string | null;
};

type NavbarSchoolUserRow = {
  school: NavbarSchoolRow | null;
};

const Navbar = async () => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

  let schools: { id: number; name: string }[] = [];

  if (userId) {
    if (isDesktopRuntime()) {
      // Desktop mode - use SQLite
      try {
        const db = getSqliteDb();
        const stmt = db.prepare(
          `SELECT DISTINCT s.id, s.name 
           FROM school s
           INNER JOIN school_user su ON s.id = su.school_id
           WHERE su.user_id = ?`
        );
        const rows = stmt.all(userId) as { id: number; name: string }[];
        schools = rows;
      } catch (error) {
        console.warn("Desktop Navbar schools query failed:", error);
        schools = [];
      }
    } else {
      // Online mode - use original Prisma logic
      const prisma = (await import("@/lib/prisma")).default;
      const navbarPrisma = prisma as unknown as {
        schoolUser: {
          findMany: (args: {
            where: { userId: string };
            include: { school: { select: { id: true; name: true } } };
          }) => Promise<NavbarSchoolUserRow[]>;
        };
      };

      const memberships = await navbarPrisma.schoolUser.findMany({
        where: { userId },
        include: { school: { select: { id: true, name: true } } },
      });

      schools = memberships
        .map((m) => m.school)
        .filter((s): s is NavbarSchoolRow => s !== null)
        .filter((s) => s.name !== null)
        .map((s) => ({ id: s.id, name: s.name! }));
    }
  }

  const user = session?.user;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                EActs
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/dashboard"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </Link>
              {(role === "admin" || role === "accountant" || role === "super") && (
                <>
                  <Link
                    href="/finance"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Finance
                  </Link>
                  <Link
                    href="/list/students"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Students
                  </Link>
                  <Link
                    href="/list/teachers"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Teachers
                  </Link>
                  <Link
                    href="/list/parents"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Parents
                  </Link>
                </>
              )}
              {role === "teacher" && (
                <Link
                  href="/teacher"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Teacher
                </Link>
              )}
              {role === "student" && (
                <Link
                  href="/student"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Student
                </Link>
              )}
              {role === "parent" && (
                <Link
                  href="/parent"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Parent
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {schools.length > 1 && (
              <SchoolSwitcher
                schools={schools}
                currentSchoolId={schoolId}
                isSuperAdmin={isSuperAdmin}
              />
            )}
            {user && (
              <div className="ml-4 flex items-center md:ml-6">
                <div className="flex items-center space-x-3">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {user.name} {user.surname}
                    </p>
                    <p className="text-gray-500">{user.role}</p>
                  </div>
                  {user.image && (
                    <Image
                      className="h-8 w-8 rounded-full"
                      src={user.image}
                      alt={`${user.name} ${user.surname}`}
                      width={32}
                      height={32}
                    />
                  )}
                  <LogoutButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
