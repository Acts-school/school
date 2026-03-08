import type { NextRequest } from "next/server";
import type { Prisma } from "../../prisma/client";

import { isDesktopRuntime } from "./runtime";
import { getSqliteDb } from "./sqliteDb";

export interface ClassListItem {
  id: number;
  name: string;
  capacity: number;
  schoolId: number | null;
  gradeId: number;
  supervisorId: string | null;
  supervisor: { name: string; surname: string } | null;
  grade: { level: number };
  _count: {
    students: number;
    lessons: number;
  };
}

export interface ClassListResult {
  data: ClassListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ClassListQuery {
  page: number;
  limit: number;
  search: string | undefined;
  supervisorId: string | null | undefined;
  gradeId: string | null | undefined;
}

interface ClassesRepository {
  list(params: ClassListQuery & { req: NextRequest; schoolId?: number | null }): Promise<ClassListResult>;
  delete(id: number, schoolId?: number | null, isSuperAdmin?: boolean): Promise<void>;
}

async function getPrismaClassesRepository(): Promise<ClassesRepository> {
  const prismaModule = await import("@/lib/prisma");
  const prisma = prismaModule.default;

  const repo: ClassesRepository = {
    async list(params) {
      const { page, limit, search, supervisorId, gradeId, schoolId } = params;

      const where: Prisma.ClassWhereInput = {};

      if (search && search.trim() !== "") {
        where.name = { contains: search, mode: "insensitive" };
      }

      if (supervisorId) {
        where.supervisorId = supervisorId;
      }

      if (gradeId) {
        where.gradeId = parseInt(gradeId, 10);
      }

      if (schoolId !== null && schoolId !== undefined) {
        where.schoolId = schoolId;
      }

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
      const offset = (safePage - 1) * safeLimit;

      const [classes, totalCount] = await prisma.$transaction([
        prisma.class.findMany({
          where,
          include: {
            supervisor: {
              select: { name: true, surname: true },
            },
            grade: {
              select: { level: true },
            },
            _count: {
              select: {
                students: true,
                lessons: true,
              },
            },
          },
          take: safeLimit,
          skip: offset,
          orderBy: { name: "asc" },
        }),
        prisma.class.count({ where }),
      ] as const);

      const data = classes as ClassListItem[];

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

    async delete(id, schoolId, isSuperAdmin) {
      // Check authorization
      const existingClass = await prisma.class.findUnique({
        where: { id },
        select: { id: true, schoolId: true },
      });

      if (!existingClass) {
        throw new Error("Class not found");
      }

      const targetSchoolId = existingClass.schoolId ?? null;

      if (!isSuperAdmin) {
        if (schoolId === null || targetSchoolId === null || targetSchoolId !== schoolId) {
          throw new Error("Unauthorized");
        }
      }

      await prisma.class.delete({
        where: { id },
      });
    },
  };

  return repo;
}

interface SqliteClassRow {
  id: number;
  name: string;
  capacity: number;
  school_id: number | null;
  grade_id: number;
  supervisor_id: string | null;
  supervisor_name: string | null;
  supervisor_surname: string | null;
  grade_level: number;
}

function getSqliteClassesRepository(): ClassesRepository {
  const db = getSqliteDb();

  const repo: ClassesRepository = {
    async list(params) {
      const { page, limit, search, supervisorId, gradeId, schoolId } = params;

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
      const offset = (safePage - 1) * safeLimit;

      const conditions: string[] = [];
      const bindings: (string | number)[] = [];

      if (search && search.trim() !== "") {
        const like = `%${search.trim()}%`;
        conditions.push("c.name LIKE ?");
        bindings.push(like);
      }

      if (supervisorId) {
        conditions.push("c.supervisor_id = ?");
        bindings.push(supervisorId);
      }

      if (gradeId) {
        conditions.push("c.grade_id = ?");
        bindings.push(parseInt(gradeId, 10));
      }

      if (schoolId !== null && schoolId !== undefined) {
        conditions.push("c.school_id = ?");
        bindings.push(schoolId);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const joinSql =
        "FROM class c " +
        "LEFT JOIN teacher t ON t.id = c.supervisor_id " +
        "LEFT JOIN grade g ON g.id = c.grade_id ";

      const countStmt = db.prepare<unknown[], { count: number }>(
        `SELECT COUNT(*) as count
         ${joinSql}
         ${whereSql}`,
      );
      const { count } = countStmt.get(bindings) ?? { count: 0 };

      const stmt = db.prepare<unknown[], SqliteClassRow>(
        `SELECT
           c.id as id,
           c.name as name,
           c.capacity as capacity,
           c.school_id as school_id,
           c.grade_id as grade_id,
           c.supervisor_id as supervisor_id,
           t.name as supervisor_name,
           t.surname as supervisor_surname,
           g.level as grade_level
         ${joinSql}
         ${whereSql}
         ORDER BY c.name ASC
         LIMIT ? OFFSET ?`,
      );

      const rows = stmt.all([...bindings, safeLimit, offset]);

      const data: ClassListItem[] = rows.map((row) => {
        return {
          id: row.id,
          name: row.name,
          capacity: row.capacity,
          schoolId: row.school_id,
          gradeId: row.grade_id,
          supervisorId: row.supervisor_id,
          supervisor: row.supervisor_name ? {
            name: row.supervisor_name,
            surname: row.supervisor_surname || "",
          } : null,
          grade: { level: row.grade_level },
          _count: {
            students: 0, // Not yet materialized
            lessons: 0,  // Not yet materialized
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

    async delete(id, schoolId, isSuperAdmin) {
      // Check authorization
      const checkStmt = db.prepare<unknown[], { school_id: number | null }>(
        "SELECT school_id FROM class WHERE id = ?"
      );
      const existing = checkStmt.get(id);

      if (!existing) {
        throw new Error("Class not found");
      }

      const targetSchoolId = existing.school_id;

      if (!isSuperAdmin) {
        if (schoolId === null || targetSchoolId === null || targetSchoolId !== schoolId) {
          throw new Error("Unauthorized");
        }
      }

      const deleteStmt = db.prepare("DELETE FROM class WHERE id = ?");
      deleteStmt.run(id);
    },
  };

  return repo;
}

export async function getClassesRepository(): Promise<ClassesRepository> {
  if (isDesktopRuntime()) {
    return getSqliteClassesRepository();
  }

  return getPrismaClassesRepository();
}
