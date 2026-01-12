import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";
import Breadcrumbs from "@/components/Breadcrumbs";
import StaffForm from "@/components/forms/StaffForm";
import SyncStaffFromUsersButton from "@/components/SyncStaffFromUsersButton";
import StaffRoleTable from "@/components/StaffRoleTable";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

export default async function StaffPage() {
  await ensurePermission("payroll.read");

  type StaffRow = {
    id: string;
    firstName: string;
    lastName: string;
    role: "ADMIN" | "TEACHER" | "ACCOUNTANT" | "NON_TEACHING" | "SUPPORT" | "OTHER";
    basicSalary: number;
    email: string | null;
    phone: string | null;
  };

  type StaffFindManyArgs = {
    orderBy: { createdAt: "asc" | "desc" };
    select: {
      id: true;
      firstName: true;
      lastName: true;
      role: true;
      basicSalary: true;
      email: true;
      phone: true;
    };
  };

  type StaffPrisma = {
    staff: {
      findMany: (args: StaffFindManyArgs) => Promise<StaffRow[]>;
    };
  };

  const staffPrisma = prisma as unknown as StaffPrisma;

  const staff = await staffPrisma.staff.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      basicSalary: true,
      email: true,
      phone: true,
    },
  });

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/finance/staff" },
          { label: "Staff" },
        ]}
      />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold">Staff</h1>
        <SyncStaffFromUsersButton />
      </div>
      <StaffForm />
      <StaffRoleTable staff={staff} />
    </div>
  );
}
