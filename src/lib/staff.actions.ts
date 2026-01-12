"use server";

import { revalidatePath } from "next/cache";
import prisma from "./prisma";
import { ensurePermission } from "@/lib/authz";
import type { StaffRole } from "./payroll.actions";

type StaffRow = {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  basicSalary: number;
  email: string | null;
  phone: string | null;
};

type StaffUpdateRoleArgs = {
  where: { id: string };
  data: { role: StaffRole };
};

type StaffCreateArgs = {
  data: {
    firstName: string;
    lastName: string;
    role: StaffRole;
    basicSalary: number;
    email?: string | null;
    phone?: string | null;
  };
};

export const updateStaffRole = async (
  _state: { success: boolean; error: boolean },
  data: UpdateStaffRoleInput,
) => {
  try {
    await ensurePermission(["payroll.write"]);

    await staffPrisma.staff.update({
      where: { id: data.id },
      data: { role: data.role },
    });

    revalidatePath("/finance/staff");
    return { success: true, error: false } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: true } as const;
  }
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

type AdminWithoutStaffRow = {
  id: string;
  username: string;
  staffId: string | null;
};

type AccountantWithoutStaffRow = {
  id: string;
  username: string;
  staffId: string | null;
};

type TeacherWithoutStaffRow = {
  id: string;
  name: string;
  surname: string;
  staffId: string | null;
};

type AdminFindManyArgs = {
  where: { staffId: null };
  select: { id: true; username: true; staffId: true };
};

type AccountantFindManyArgs = {
  where: { staffId: null };
  select: { id: true; username: true; staffId: true };
};

type TeacherFindManyArgs = {
  where: { staffId: null };
  select: { id: true; name: true; surname: true; staffId: true };
};

type AdminUpdateArgs = {
  where: { id: string };
  data: { staffId: string };
};

type AccountantUpdateArgs = {
  where: { id: string };
  data: { staffId: string };
};

type TeacherUpdateArgs = {
  where: { id: string };
  data: { staffId: string };
};

type PrismaStaffClient = {
  staff: {
    create: (args: StaffCreateArgs) => Promise<StaffRow>;
    findMany: (args: StaffFindManyArgs) => Promise<StaffRow[]>;
    update: (args: StaffUpdateRoleArgs) => Promise<StaffRow>;
  };
  admin: {
    findMany: (args: AdminFindManyArgs) => Promise<AdminWithoutStaffRow[]>;
    update: (args: AdminUpdateArgs) => Promise<unknown>;
  };
  accountant: {
    findMany: (args: AccountantFindManyArgs) => Promise<AccountantWithoutStaffRow[]>;
    update: (args: AccountantUpdateArgs) => Promise<unknown>;
  };
  teacher: {
    findMany: (args: TeacherFindManyArgs) => Promise<TeacherWithoutStaffRow[]>;
    update: (args: TeacherUpdateArgs) => Promise<unknown>;
  };
};

const staffPrisma = prisma as unknown as PrismaStaffClient;

export type CreateStaffInput = {
  firstName: string;
  lastName: string;
  role: StaffRole;
  basicSalaryMinor: number;
  email?: string;
  phone?: string;
};

export type UpdateStaffRoleInput = {
  id: string;
  role: StaffRole;
};

export const createStaff = async (
  _state: { success: boolean; error: boolean },
  data: CreateStaffInput,
) => {
  try {
    await ensurePermission(["payroll.write"]);

    await staffPrisma.staff.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        basicSalary: data.basicSalaryMinor,
        ...(data.email ? { email: data.email } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
      },
    });

    revalidatePath("/finance/staff");
    return { success: true, error: false } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: true } as const;
  }
};

export type SyncStaffFromUsersInput = {
  confirm: boolean;
};

export const syncStaffFromUsers = async (
  _state: { success: boolean; error: boolean },
  _data: SyncStaffFromUsersInput,
) => {
  try {
    await ensurePermission(["payroll.write"]);

    const [admins, accountants, teachers] = await Promise.all([
      staffPrisma.admin.findMany({
        where: { staffId: null },
        select: { id: true, username: true, staffId: true },
      }),
      staffPrisma.accountant.findMany({
        where: { staffId: null },
        select: { id: true, username: true, staffId: true },
      }),
      staffPrisma.teacher.findMany({
        where: { staffId: null },
        select: { id: true, name: true, surname: true, staffId: true },
      }),
    ]);

    for (const admin of admins) {
      const created = await staffPrisma.staff.create({
        data: {
          firstName: admin.username,
          lastName: "",
          role: "ADMIN",
          basicSalary: 0,
        },
      });

      await staffPrisma.admin.update({
        where: { id: admin.id },
        data: { staffId: created.id },
      });
    }

    for (const acc of accountants) {
      const created = await staffPrisma.staff.create({
        data: {
          firstName: acc.username,
          lastName: "",
          role: "ACCOUNTANT",
          basicSalary: 0,
        },
      });

      await staffPrisma.accountant.update({
        where: { id: acc.id },
        data: { staffId: created.id },
      });
    }

    for (const teacher of teachers) {
      const created = await staffPrisma.staff.create({
        data: {
          firstName: teacher.name,
          lastName: teacher.surname,
          role: "TEACHER",
          basicSalary: 0,
        },
      });

      await staffPrisma.teacher.update({
        where: { id: teacher.id },
        data: { staffId: created.id },
      });
    }

    revalidatePath("/finance/staff");
    return { success: true, error: false } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: true } as const;
  }
};
