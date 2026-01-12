import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { roleToPermissions, type Permission, type PermissionSet, type BaseRole } from "@/lib/rbac";

type SchoolUserRow = {
  schoolId: number;
  role: string;
};

type SchoolPrisma = {
  schoolUser: {
    findMany: (args: {
      where: { userId: string };
      select: { schoolId: true; role: true };
    }) => Promise<SchoolUserRow[]>;
  };
};

const schoolPrisma = prisma as unknown as SchoolPrisma;

export type AuthContext = {
  userId: string;
  role: BaseRole;
  permissions: PermissionSet;
};

export const getAuthContext = async (): Promise<AuthContext | null> => {
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
    return { schoolId: null, isSuperAdmin: true };
  }

  const firstMembership = memberships[0];
  return { schoolId: firstMembership?.schoolId ?? null, isSuperAdmin: false };
};

export const ensurePermission = async (
  required: Permission | ReadonlyArray<Permission>
): Promise<void> => {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new Error("Unauthorized");
  }
  const requiredList = Array.isArray(required) ? required : [required];
  const set = new Set(ctx.permissions);
  const ok = requiredList.every((p) => set.has(p));
  if (!ok) {
    throw new Error("Forbidden");
  }
};
