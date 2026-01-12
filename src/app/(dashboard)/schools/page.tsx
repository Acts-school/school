import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const SCHOOL_USER_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "ACCOUNTANT",
] as const;

export type SchoolUserRole = (typeof SCHOOL_USER_ROLES)[number];

const isSchoolUserRole = (value: unknown): value is SchoolUserRole =>
  typeof value === "string" &&
  SCHOOL_USER_ROLES.includes(value as SchoolUserRole);

type SchoolUserCreateInput = {
  schoolId: number;
  userId: string;
  role: SchoolUserRole;
};

type SchoolUserWhereUniqueInput = {
  id: number;
};

type SchoolMembershipRow = {
  id: number;
  userId: string;
  role: string;
};

type SchoolRow = {
  id: number;
  name: string;
  code: string | null;
  active: boolean;
  memberships: SchoolMembershipRow[];
};

type SchoolsPrisma = {
  schoolUser: {
    create: (args: { data: SchoolUserCreateInput }) => Promise<unknown>;
    delete: (args: { where: SchoolUserWhereUniqueInput }) => Promise<unknown>;
    findFirst: (args: {
      where: { userId: string; role: string };
      select: { id: true };
    }) => Promise<{ id: number } | null>;
  };
  school: {
    findMany: (args: {
      orderBy: { name: "asc" | "desc" };
      include: { memberships: { orderBy: { id: "asc" | "desc" } } };
    }) => Promise<SchoolRow[]>;
  };
};

const schoolsPrisma = prisma as unknown as SchoolsPrisma;

const addSchoolMembership = async (formData: FormData): Promise<void> => {
  "use server";

  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role !== "admin") {
    throw new Error("Forbidden");
  }

  const schoolIdRaw = formData.get("schoolId");
  const userIdRaw = formData.get("userId");
  const membershipRoleRaw = formData.get("membershipRole");

  if (typeof schoolIdRaw !== "string" || typeof userIdRaw !== "string") {
    throw new Error("Invalid form data");
  }

  if (!isSchoolUserRole(membershipRoleRaw)) {
    throw new Error("Invalid membership role");
  }

  const schoolIdNumber = Number.parseInt(schoolIdRaw, 10);

  if (!Number.isFinite(schoolIdNumber)) {
    throw new Error("Invalid school id");
  }

  await schoolsPrisma.schoolUser.create({
    data: {
      schoolId: schoolIdNumber,
      userId: userIdRaw,
      role: membershipRoleRaw,
    },
  });

  revalidatePath("/schools");
};

const removeSchoolMembership = async (formData: FormData): Promise<void> => {
  "use server";

  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role !== "admin") {
    throw new Error("Forbidden");
  }

  const membershipIdRaw = formData.get("membershipId");

  if (typeof membershipIdRaw !== "string") {
    throw new Error("Invalid form data");
  }

  const membershipIdNumber = Number.parseInt(membershipIdRaw, 10);

  if (!Number.isFinite(membershipIdNumber)) {
    throw new Error("Invalid membership id");
  }

  await schoolsPrisma.schoolUser.delete({ where: { id: membershipIdNumber } });

  revalidatePath("/schools");
};

export default async function SchoolsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const userId = session?.user?.id;

  if (role !== "admin" || !userId) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Schools &amp; Memberships</h1>
        <div className="bg-white p-4 rounded-md shadow-sm max-w-md">
          <p className="text-sm text-gray-500">You do not have access to this page.</p>
        </div>
      </div>
    );
  }

  const superAdminMembership = await schoolsPrisma.schoolUser.findFirst({
    where: { userId, role: "SUPER_ADMIN" },
    select: { id: true },
  });

  if (!superAdminMembership) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Schools &amp; Memberships</h1>
        <div className="bg-white p-4 rounded-md shadow-sm max-w-md">
          <p className="text-sm text-gray-500">You do not have access to this page.</p>
        </div>
      </div>
    );
  }

  const schools: SchoolRow[] = await schoolsPrisma.school.findMany({
    orderBy: { name: "asc" },
    include: {
      memberships: {
        orderBy: { id: "asc" },
      },
    },
  });

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Schools &amp; Memberships</h1>

      <div className="bg-white p-4 rounded-md shadow-sm max-w-2xl">
        <h2 className="text-lg font-semibold mb-2">Add membership</h2>
        <p className="text-sm text-gray-500 mb-4">
          Link a user to a school with a specific membership role (for example
          SUPER_ADMIN, SCHOOL_ADMIN, ACCOUNTANT). You will need the user&apos;s ID.
        </p>

        <form action={addSchoolMembership} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">School</span>
            <select
              name="schoolId"
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              required
            >
              <option value="" disabled>
                Select a school
              </option>
              {schools.map((school: SchoolRow) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                  {school.code ? ` (${school.code})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">User ID</span>
            <input
              name="userId"
              type="text"
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Membership role</span>
            <select
              name="membershipRole"
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select a role
              </option>
              {SCHOOL_USER_ROLES.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="self-start mt-2 px-4 py-2 rounded-md bg-lamaPurple text-white text-sm font-medium"
          >
            Add membership
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        {schools.map((school: SchoolRow) => (
          <div key={school.id} className="bg-white p-4 rounded-md shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold">{school.name}</h2>
                <p className="text-xs text-gray-500">
                  ID: {school.id}
                  {school.code ? ` • Code: ${school.code}` : ""}
                  {school.active ? " • Active" : " • Inactive"}
                </p>
              </div>
              <div className="text-xs text-gray-500">
                {school.memberships.length} membership
                {school.memberships.length === 1 ? "" : "s"}
              </div>
            </div>

            {school.memberships.length === 0 ? (
              <p className="text-sm text-gray-500">No memberships yet.</p>
            ) : (
              <table className="w-full text-sm border-t border-gray-200 pt-2 mt-2">
                <thead>
                  <tr className="text-left text-gray-500 text-xs">
                    <th className="py-2">Membership ID</th>
                    <th className="py-2">User ID</th>
                    <th className="py-2">Role</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {school.memberships.map((membership: SchoolMembershipRow) => (
                    <tr
                      key={membership.id}
                      className="border-t border-gray-100 hover:bg-lamaPurpleLight/30"
                    >
                      <td className="py-2 pr-2 align-middle">{membership.id}</td>
                      <td className="py-2 pr-2 align-middle">{membership.userId}</td>
                      <td className="py-2 pr-2 align-middle">{membership.role}</td>
                      <td className="py-2 pl-2 align-middle text-right">
                        <form action={removeSchoolMembership}>
                          <input
                            type="hidden"
                            name="membershipId"
                            value={membership.id}
                          />
                          <button
                            type="submit"
                            className="px-3 py-1 rounded-md border border-red-300 text-red-600 text-xs hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
