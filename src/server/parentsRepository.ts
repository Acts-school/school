import type { NextRequest } from "next/server";
import type { Prisma } from "../../prisma/client";

import { isDesktopRuntime } from "./runtime";
import { getSqliteDb } from "./sqliteDb";

export interface ParentListItem {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string;
  address: string | null;
  students: { name: string; surname: string }[];
}

export interface ParentListResult {
  data: ParentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ParentListQuery {
  page: number;
  limit: number;
  search: string | undefined;
}

interface ParentsRepository {
  list(params: ParentListQuery & { req: NextRequest }): Promise<ParentListResult>;
}

async function getPrismaParentsRepository(): Promise<ParentsRepository> {
  const prismaModule = await import("@/lib/prisma");
  const prisma = prismaModule.default;

  const repo: ParentsRepository = {
    async list(params) {
      const { page, limit, search } = params;

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
      const offset = (safePage - 1) * safeLimit;

      const where: Prisma.ParentWhereInput = {};

      if (search && search.trim() !== "") {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { surname: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      const [parents, totalCount] = await prisma.$transaction([
        prisma.parent.findMany({
          where,
          include: {
            students: {
              select: { name: true, surname: true },
            },
          },
          take: safeLimit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        }),
        prisma.parent.count({ where }),
      ] as const);

      const data = parents as ParentListItem[];

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

interface SqliteParentRow {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string;
  address: string | null;
}

function getSqliteParentsRepository(): ParentsRepository {
  const db = getSqliteDb();

  const repo: ParentsRepository = {
    async list(params) {
      const { page, limit, search } = params;

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
      const offset = (safePage - 1) * safeLimit;

      const conditions: string[] = [];
      const bindings: (string | number)[] = [];

      if (search && search.trim() !== "") {
        const like = `%${search.trim()}%`;
        conditions.push("(name LIKE ? OR surname LIKE ? OR phone LIKE ? OR username LIKE ? OR email LIKE ?)");
        bindings.push(like, like, like, like, like);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countStmt = db.prepare<unknown[], { count: number }>(
        `SELECT COUNT(*) as count
         FROM parent
         ${whereSql}`,
      );
      const { count } = countStmt.get(bindings) ?? { count: 0 };

      const stmt = db.prepare<unknown[], SqliteParentRow>(
        `SELECT
           id,
           username,
           name,
           surname,
           email,
           phone,
           address
         FROM parent
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      );

      const rows = stmt.all([...bindings, safeLimit, offset]);

      const data: ParentListItem[] = rows.map((row) => {
        return {
          id: row.id,
          username: row.username,
          name: row.name,
          surname: row.surname,
          email: row.email,
          phone: row.phone,
          address: row.address,
          // Student relations are not yet normalized in this materializer;
          // return empty arrays to preserve the API shape for the UI.
          students: [],
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

export async function getParentsRepository(): Promise<ParentsRepository> {
  if (isDesktopRuntime()) {
    return getSqliteParentsRepository();
  }

  return getPrismaParentsRepository();
}
