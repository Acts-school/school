import type { NextRequest } from "next/server";
import type { Prisma } from "../../prisma/client";

import { isDesktopRuntime } from "./runtime";
import { getSqliteDb } from "./sqliteDb";

export interface TeacherListItem {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  img: string | null;
  subjects: { name: string }[];
  classes: { name: string }[];
  _count: {
    subjects: number;
    lessons: number;
    classes: number;
  };
}

export interface TeacherListResult {
  data: TeacherListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TeacherListQuery {
  page: number;
  limit: number;
  search: string | undefined;
  classId: string | undefined;
}

interface TeachersRepository {
  list(params: TeacherListQuery & { req: NextRequest }): Promise<TeacherListResult>;
}

async function getPrismaTeachersRepository(): Promise<TeachersRepository> {
  const prismaModule = await import("@/lib/prisma");
  const prisma = prismaModule.default;

  const repo: TeachersRepository = {
    async list(params) {
      const { page, limit, search, classId } = params;

      const where: Prisma.TeacherWhereInput = {};

      if (search && search.trim() !== "") {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { surname: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      if (classId) {
        where.lessons = {
          some: {
            classId: Number.parseInt(classId, 10),
          },
        };
      }

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
      const offset = (safePage - 1) * safeLimit;

      const [teachers, totalCount] = await prisma.$transaction([
        prisma.teacher.findMany({
          where,
          include: {
            subjects: { select: { name: true } },
            classes: { select: { name: true } },
            _count: { select: { subjects: true, lessons: true, classes: true } },
          },
          take: safeLimit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        }),
        prisma.teacher.count({ where }),
      ] as const);

      const data = teachers as TeacherListItem[];

      return {
        data,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / safeLimit),
        },
      };
    },
  };

  return repo;
}

interface SqliteTeacherRow {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  img: string | null;
}

function getSqliteTeachersRepository(): TeachersRepository {
  const db = getSqliteDb();

  const repo: TeachersRepository = {
    async list(params) {
      const { page, limit, search } = params;

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
      const offset = (safePage - 1) * safeLimit;

      const conditions: string[] = [];
      const bindings: (string | number)[] = [];

      if (search && search.trim() !== "") {
        const like = `%${search.trim()}%`;
        conditions.push("(name LIKE ? OR surname LIKE ? OR email LIKE ?)");
        bindings.push(like, like, like);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countStmt = db.prepare<unknown[], { count: number }>(
        `SELECT COUNT(*) as count
         FROM teacher
         ${whereSql}`,
      );
      const { count } = countStmt.get(bindings) ?? { count: 0 };

      const stmt = db.prepare<unknown[], SqliteTeacherRow>(
        `SELECT
           id,
           username,
           name,
           surname,
           email,
           phone,
           address,
           img
         FROM teacher
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      );

      const rows = stmt.all([...bindings, safeLimit, offset]);

      const data: TeacherListItem[] = rows.map((row) => {
        return {
          id: row.id,
          username: row.username,
          name: row.name,
          surname: row.surname,
          email: row.email,
          phone: row.phone,
          address: row.address,
          img: row.img,
          // Subject/class relations are not yet materialized; return empty arrays
          // to preserve the API shape without breaking the UI.
          subjects: [],
          classes: [],
          _count: {
            subjects: 0,
            lessons: 0,
            classes: 0,
          },
        };
      });

      return {
        data,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: count,
          totalPages: count === 0 ? 0 : Math.ceil(count / safeLimit),
        },
      };
    },
  };

  return repo;
}

export async function getTeachersRepository(): Promise<TeachersRepository> {
  if (isDesktopRuntime()) {
    return getSqliteTeachersRepository();
  }

  return getPrismaTeachersRepository();
}
