import type { NextRequest } from "next/server";
import type { Prisma } from "../../prisma/client";

import { isDesktopRuntime } from "./runtime";
import { getSqliteDb } from "./sqliteDb";

export interface SubjectListItem {
  id: number;
  name: string;
  teachers: { name: string; surname: string }[];
  _count: {
    teachers: number;
    lessons: number;
  };
}

export interface SubjectListResult {
  data: SubjectListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SubjectListQuery {
  page: number;
  limit: number;
  search: string | undefined;
}

interface SubjectsRepository {
  list(params: SubjectListQuery & { req: NextRequest }): Promise<SubjectListResult>;
  delete(id: number, isSuperAdmin?: boolean): Promise<void>;
}

async function getPrismaSubjectsRepository(): Promise<SubjectsRepository> {
  const prismaModule = await import("@/lib/prisma");
  const prisma = prismaModule.default;

  const repo: SubjectsRepository = {
    async list(params) {
      const { page, limit, search } = params;

      const where: Prisma.SubjectWhereInput = {};

      if (search && search.trim() !== "") {
        where.name = { contains: search, mode: "insensitive" };
      }

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
      const offset = (safePage - 1) * safeLimit;

      const [subjects, totalCount] = await prisma.$transaction([
        prisma.subject.findMany({
          where,
          include: {
            teachers: {
              select: { name: true, surname: true },
            },
            _count: {
              select: {
                teachers: true,
                lessons: true,
              },
            },
          },
          take: safeLimit,
          skip: offset,
          orderBy: { name: "asc" },
        }),
        prisma.subject.count({ where }),
      ] as const);

      const data = subjects as SubjectListItem[];

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

    async delete(id, isSuperAdmin) {
      // Check authorization - only superadmin can delete subjects
      if (!isSuperAdmin) {
        throw new Error("Unauthorized");
      }

      // Check if subject exists
      const existingSubject = await prisma.subject.findUnique({
        where: { id },
      });

      if (!existingSubject) {
        throw new Error("Subject not found");
      }

      await prisma.subject.delete({
        where: { id },
      });
    },
  };

  return repo;
}

interface SqliteSubjectRow {
  id: number;
  name: string;
}

function getSqliteSubjectsRepository(): SubjectsRepository {
  const db = getSqliteDb();

  const repo: SubjectsRepository = {
    async list(params) {
      const { page, limit, search } = params;

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
      const offset = (safePage - 1) * safeLimit;

      const conditions: string[] = [];
      const bindings: (string | number)[] = [];

      if (search && search.trim() !== "") {
        const like = `%${search.trim()}%`;
        conditions.push("name LIKE ?");
        bindings.push(like);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countStmt = db.prepare<unknown[], { count: number }>(
        `SELECT COUNT(*) as count
         FROM subject
         ${whereSql}`,
      );
      const { count } = countStmt.get(bindings) ?? { count: 0 };

      const stmt = db.prepare<unknown[], SqliteSubjectRow>(
        `SELECT
           id,
           name
         FROM subject
         ${whereSql}
         ORDER BY name ASC
         LIMIT ? OFFSET ?`,
      );

      const rows = stmt.all([...bindings, safeLimit, offset]);

      const data: SubjectListItem[] = rows.map((row) => {
        return {
          id: row.id,
          name: row.name,
          // Teacher relations are not yet materialized; return empty arrays
          // to preserve the API shape without breaking the UI.
          teachers: [],
          _count: {
            teachers: 0,
            lessons: 0,
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

    async delete(id, isSuperAdmin) {
      // Check authorization - only superadmin can delete subjects
      if (!isSuperAdmin) {
        throw new Error("Unauthorized");
      }

      // Check if subject exists
      const checkStmt = db.prepare<unknown[], { id: number }>(
        "SELECT id FROM subject WHERE id = ?"
      );
      const existing = checkStmt.get(id);

      if (!existing) {
        throw new Error("Subject not found");
      }

      const deleteStmt = db.prepare("DELETE FROM subject WHERE id = ?");
      deleteStmt.run(id);
    },
  };

  return repo;
}

export async function getSubjectsRepository(): Promise<SubjectsRepository> {
  if (isDesktopRuntime()) {
    return getSqliteSubjectsRepository();
  }

  return getPrismaSubjectsRepository();
}
