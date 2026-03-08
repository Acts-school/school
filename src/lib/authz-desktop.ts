import { cookies } from "next/headers";
import { roleToPermissions, type PermissionSet, type BaseRole } from "@/lib/rbac";
import { isDesktopRuntime } from "@/server/runtime";
import { getSqliteDb } from "@/server/sqliteDb";

export type AuthContext = {
  userId: string;
  role: BaseRole;
  permissions: PermissionSet;
};

export const getAuthContext = async (): Promise<AuthContext | null> => {
  const [{ getServerSession }, { authOptions }] = await Promise.all([
    import("next-auth"),
    import("@/pages/api/auth/[...nextauth]"),
  ]);

  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!role || !id) return null;
  const permissions = roleToPermissions(role);
  return { userId: id, role, permissions };
};

export type SchoolContext = {
  schoolId: number | null;
  isSuperAdmin: boolean;
};

export const getCurrentSchoolContext = async (): Promise<SchoolContext> => {
  const ctx = await getAuthContext();
  if (!ctx) {
    return { schoolId: null, isSuperAdmin: false };
  }

  // In desktop mode, we'll use a simplified approach
  if (isDesktopRuntime()) {
    // For desktop mode, we'll use the first school or a default
    // This is a simplified approach for offline functionality
    const db = getSqliteDb();
    
    try {
      const stmt = db.prepare(
        `SELECT DISTINCT school_id as schoolId, role 
         FROM school_user 
         WHERE user_id = ?`
      );
      const memberships = stmt.all(ctx.userId) as { schoolId: number; role: string }[];
      
      const isSuperAdmin = memberships.some((m) => m.role === "SUPER_ADMIN");
      const firstMembership = memberships[0];
      
      return {
        schoolId: firstMembership?.schoolId ?? null,
        isSuperAdmin
      };
    } catch (error) {
      // If SQLite query fails, return default context
      console.warn("Desktop auth context failed, using default:", error);
      return { schoolId: null, isSuperAdmin: false };
    }
  }

  // Online mode - use original Prisma logic
  const prisma = (await import("@/lib/prisma")).default;
  const schoolPrisma = prisma as unknown as {
    schoolUser: {
      findMany: (args: {
        where: { userId: string };
        select: { schoolId: true; role: true };
      }) => Promise<{ schoolId: number; role: string }[]>;
    };
  };

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("currentSchoolId")?.value;
  const parsedFromCookie = cookieValue ? Number.parseInt(cookieValue, 10) : Number.NaN;

  const memberships = await schoolPrisma.schoolUser.findMany({
    where: { userId: ctx.userId },
    select: { schoolId: true, role: true },
  });

  const isSuperAdmin = memberships.some((m) => m.role === "SUPER_ADMIN");

  if (!Number.isNaN(parsedFromCookie)) {
    const selected = memberships.find((m) => m.schoolId === parsedFromCookie);
    if (selected) {
      return { schoolId: selected.schoolId, isSuperAdmin };
    }
  }

  if (isSuperAdmin) {
    // SUPER_ADMIN users without a valid selection operate in global (unscoped) mode
    return { schoolId: null, isSuperAdmin };
  }

  const firstMembership = memberships[0];
  return { schoolId: firstMembership?.schoolId ?? null, isSuperAdmin };
};
