import type { NextRequest } from "next/server";
import type { Prisma } from "../../prisma/client";

import { isDesktopRuntime } from "./runtime";
import { getSqliteDb } from "./sqliteDb";

export interface StudentFeeListItem {
  id: string;
  studentId: string;
  student: {
    id: string;
    name: string;
    surname: string;
    class: { id: number; name: string };
    grade: { id: number; level: number };
  };
  structureId: number | null;
  amountDue: number;
  amountPaid: number;
  status: string;
  dueDate: Date | null;
  createdAt: Date;
}

export interface StudentFeeListResult {
  data: StudentFeeListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StudentFeeListQuery {
  page: number;
  limit: number;
  structureId: number;
  search: string | undefined;
}

interface StudentFeesRepository {
  list(params: StudentFeeListQuery & { req: NextRequest }): Promise<StudentFeeListResult>;
}

async function getPrismaStudentFeesRepository(): Promise<StudentFeesRepository> {
  const prismaModule = await import("@/lib/prisma");
  const prisma = prismaModule.default;

  const repo: StudentFeesRepository = {
    async list(params) {
      const { page, limit, structureId, search } = params;

      const where: Prisma.StudentFeeWhereInput = {
        structureId,
      };

      if (search && search.trim() !== "") {
        where.AND = [
          {
            OR: [
              {
                student: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                student: {
                  surname: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          },
        ];
      }

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
      const offset = (safePage - 1) * safeLimit;

      const [feesResult, totalCount] = await prisma.$transaction([
        prisma.studentFee.findMany({
          where,
          select: {
            id: true,
            studentId: true,
            student: {
              select: {
                id: true,
                name: true,
                surname: true,
                class: { select: { id: true, name: true } },
                grade: { select: { id: true, level: true } },
              },
            },
            structureId: true,
            amountDue: true,
            amountPaid: true,
            status: true,
            dueDate: true,
            createdAt: true,
          },
          take: safeLimit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        }),
        prisma.studentFee.count({ where }),
      ] as const);

      const data = feesResult as StudentFeeListItem[];

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

interface SqliteStudentFeeRow {
  id: string;
  student_id: string;
  student_name: string;
  student_surname: string;
  class_id: number;
  class_name: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  due_date: string | null;
  created_at: string;
}

function getSqliteStudentFeesRepository(): StudentFeesRepository {
  const db = getSqliteDb();

  const repo: StudentFeesRepository = {
    async list(params) {
      const { page, limit, structureId, search } = params;

      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
      const offset = (safePage - 1) * safeLimit;

      const conditions: string[] = [
        "cfs.id = ?",
      ];
      const bindings: (string | number)[] = [structureId];

      if (search && search.trim() !== "") {
        const like = `%${search.trim()}%`;
        conditions.push("(s.name LIKE ? OR s.surname LIKE ?)");
        bindings.push(like, like);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const joinSql =
        "FROM student_fee sf " +
        "JOIN student s ON s.id = sf.student_id " +
        "JOIN class c ON c.id = s.class_id " +
        "JOIN class_fee_structure cfs ON " +
        "  cfs.class_id = c.id AND " +
        "  cfs.fee_category_id = sf.fee_category_id AND " +
        "  ((cfs.term IS NULL AND sf.term IS NULL) OR cfs.term = sf.term) AND " +
        "  ((cfs.academic_year IS NULL AND sf.academic_year IS NULL) OR cfs.academic_year = sf.academic_year) ";

      const countStmt = db.prepare<unknown[], { count: number }>(
        `SELECT COUNT(*) as count
         ${joinSql}
         ${whereSql}`,
      );
      const { count } = countStmt.get(bindings) ?? { count: 0 };

      const stmt = db.prepare<unknown[], SqliteStudentFeeRow>(
        `SELECT
           sf.id as id,
           sf.student_id as student_id,
           s.name as student_name,
           s.surname as student_surname,
           c.id as class_id,
           c.name as class_name,
           sf.amount_due as amount_due,
           sf.amount_paid as amount_paid,
           sf.status as status,
           sf.due_date as due_date,
           sf.created_at as created_at
         ${joinSql}
         ${whereSql}
         ORDER BY sf.created_at DESC
         LIMIT ? OFFSET ?`,
      );

      const rows = stmt.all([...bindings, safeLimit, offset]);

      const data: StudentFeeListItem[] = rows.map((row) => {
        return {
          id: row.id,
          studentId: row.student_id,
          student: {
            id: row.student_id,
            name: row.student_name,
            surname: row.student_surname,
            class: { id: row.class_id, name: row.class_name },
            // Grade information is not yet normalized in SQLite; we expose
            // placeholder values to satisfy the existing API shape.
            grade: { id: 0, level: 0 },
          },
          structureId,
          amountDue: row.amount_due,
          amountPaid: row.amount_paid,
          status: row.status,
          dueDate: row.due_date !== null ? new Date(row.due_date) : null,
          createdAt: new Date(row.created_at),
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

export async function getStudentFeesRepository(): Promise<StudentFeesRepository> {
  if (isDesktopRuntime()) {
    return getSqliteStudentFeesRepository();
  }

  return getPrismaStudentFeesRepository();
}
