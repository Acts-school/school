import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensurePermission, getAuthContext } from "@/lib/authz";

// Narrowed Prisma facade for recipient lookups

type StudentRecipientRow = {
  id: string;
  username: string;
  name: string;
  surname: string;
};

type TeacherRecipientRow = {
  id: string;
  username: string;
  name: string;
  surname: string;
};

type ParentRecipientRow = {
  id: string;
  username: string;
  name: string;
  surname: string;
};

type AdminRecipientRow = {
  id: string;
  username: string;
};

type AccountantRecipientRow = {
  id: string;
  username: string;
};

type StudentFindManyArgs = {
  where: {
    OR?: Array<{
      name?: { contains: string; mode: "insensitive" };
      surname?: { contains: string; mode: "insensitive" };
      username?: { contains: string; mode: "insensitive" };
    }>;
  };
  select: {
    id: true;
    username: true;
    name: true;
    surname: true;
  };
  take: number;
  orderBy: { name: "asc" };
};

type TeacherFindManyArgs = {
  where: {
    OR?: Array<{
      name?: { contains: string; mode: "insensitive" };
      surname?: { contains: string; mode: "insensitive" };
      username?: { contains: string; mode: "insensitive" };
    }>;
  };
  select: {
    id: true;
    username: true;
    name: true;
    surname: true;
  };
  take: number;
  orderBy: { name: "asc" };
};

type ParentFindManyArgs = {
  where: {
    OR?: Array<{
      name?: { contains: string; mode: "insensitive" };
      surname?: { contains: string; mode: "insensitive" };
      username?: { contains: string; mode: "insensitive" };
    }>;
  };
  select: {
    id: true;
    username: true;
    name: true;
    surname: true;
  };
  take: number;
  orderBy: { name: "asc" };
};

type AdminFindManyArgs = {
  where: {
    username?: { contains: string; mode: "insensitive" };
  };
  select: {
    id: true;
    username: true;
  };
  take: number;
  orderBy: { username: "asc" };
};

type AccountantFindManyArgs = {
  where: {
    username?: { contains: string; mode: "insensitive" };
  };
  select: {
    id: true;
    username: true;
  };
  take: number;
  orderBy: { username: "asc" };
};

type RecipientsPrismaClient = {
  student: {
    findMany: (args: StudentFindManyArgs) => Promise<StudentRecipientRow[]>;
  };
  teacher: {
    findMany: (args: TeacherFindManyArgs) => Promise<TeacherRecipientRow[]>;
  };
  parent: {
    findMany: (args: ParentFindManyArgs) => Promise<ParentRecipientRow[]>;
  };
  admin: {
    findMany: (args: AdminFindManyArgs) => Promise<AdminRecipientRow[]>;
  };
  accountant: {
    findMany: (args: AccountantFindManyArgs) => Promise<AccountantRecipientRow[]>;
  };
};

const recipientsPrisma = prisma as unknown as RecipientsPrismaClient;

export type RecipientKind = "student" | "teacher" | "parent" | "admin" | "accountant";

export type RecipientDto = {
  userId: string;
  kind: RecipientKind;
  name: string;
  username: string;
};

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  try {
    await ensurePermission("messages.send");
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const qRaw = searchParams.get("q") ?? "";
    const q = qRaw.trim();

    if (q.length < 2) {
      return NextResponse.json({ recipients: [] as RecipientDto[] });
    }

    const [students, teachers, parents, admins, accountants] = await Promise.all([
      recipientsPrisma.student.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { surname: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, username: true, name: true, surname: true },
        take: 10,
        orderBy: { name: "asc" },
      } as StudentFindManyArgs),
      recipientsPrisma.teacher.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { surname: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, username: true, name: true, surname: true },
        take: 10,
        orderBy: { name: "asc" },
      } as TeacherFindManyArgs),
      recipientsPrisma.parent.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { surname: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, username: true, name: true, surname: true },
        take: 10,
        orderBy: { name: "asc" },
      } as ParentFindManyArgs),
      recipientsPrisma.admin.findMany({
        where: {
          username: { contains: q, mode: "insensitive" },
        },
        select: { id: true, username: true },
        take: 10,
        orderBy: { username: "asc" },
      } as AdminFindManyArgs),
      recipientsPrisma.accountant.findMany({
        where: {
          username: { contains: q, mode: "insensitive" },
        },
        select: { id: true, username: true },
        take: 10,
        orderBy: { username: "asc" },
      } as AccountantFindManyArgs),
    ]);

    const recipients: RecipientDto[] = [
      ...students.map<RecipientDto>((s) => ({
        userId: s.id,
        kind: "student",
        name: `${s.name} ${s.surname}`.trim(),
        username: s.username,
      })),
      ...teachers.map<RecipientDto>((t) => ({
        userId: t.id,
        kind: "teacher",
        name: `${t.name} ${t.surname}`.trim(),
        username: t.username,
      })),
      ...parents.map<RecipientDto>((p) => ({
        userId: p.id,
        kind: "parent",
        name: `${p.name} ${p.surname}`.trim(),
        username: p.username,
      })),
      ...admins.map<RecipientDto>((a) => ({
        userId: a.id,
        kind: "admin",
        name: a.username,
        username: a.username,
      })),
      ...accountants.map<RecipientDto>((a) => ({
        userId: a.id,
        kind: "accountant",
        name: a.username,
        username: a.username,
      })),
    ];

    return NextResponse.json({ recipients });
  } catch (error) {
    console.error("Error in GET /api/messages/recipients", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
