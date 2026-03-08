import type { NextRequest } from "next/server";
import type { Prisma } from "../../prisma/client";

import { isDesktopRuntime } from "./runtime";
import { getSqliteDb } from "./sqliteDb";

export interface StudentListItem {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  img: string | null;
  class: { name: string };
  grade: { level: number };
  parent: { name: string; surname: string; phone: string } | null;
  _count: {
    attendances: number;
    results: number;
  };
}

export interface StudentListResult {
  data: StudentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StudentListQuery {
  page: number;
  limit: number;
  search: string | undefined;
  classId: string | undefined;
  teacherId: string | undefined;
}

interface StudentsRepository {
  list(params: StudentListQuery & { schoolId: number | null; req: NextRequest }): Promise<StudentListResult>;
}

async function getPrismaStudentsRepository(): Promise<StudentsRepository> {
  const prismaModule = await import("@/lib/prisma");
  const prisma = prismaModule.default;

  const repo: StudentsRepository = {
    async list(params) {
      const { page, limit, search, classId, teacherId, schoolId } = params;

      const where: Prisma.StudentWhereInput = {
        status: "ACTIVE",
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { surname: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      const classFilter: Prisma.ClassWhereInput = {};

      if (classId) {
        classFilter.id = Number.parseInt(classId, 10);
      }

      if (teacherId) {
        classFilter.lessons = {
          some: {
            teacherId,
          },
        };
      }

      if (schoolId !== null) {
        (classFilter as Record<string, unknown>).schoolId = schoolId;
      }

      if (Object.keys(classFilter).length > 0) {
        where.class = classFilter;
      }

      const offset = (page - 1) * limit;

      const [students, totalCount] = await prisma.$transaction([
        prisma.student.findMany({
          where,
          include: {
            class: { select: { name: true } },
            grade: { select: { level: true } },
            parent: { select: { name: true, surname: true, phone: true } },
            _count: { select: { attendances: true, results: true } },
          },
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        }),
        prisma.student.count({ where }),
      ] as const);

      return {
        data: students,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    },
  };

  return repo;
}

interface SqliteStudentRow {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  img: string | null;
  class_name: string | null;
  grade_level: number | null;
  parent_name: string | null;
  parent_surname: string | null;
  parent_phone: string | null;
}

function getSqliteStudentsRepository(): StudentsRepository {
  const db = getSqliteDb();

  const repo: StudentsRepository = {
    async list(params) {
      const { page, limit, search, classId, schoolId } = params;
      const offset = (page - 1) * limit;

      const conditions: string[] = ["s.status = 'ACTIVE'"];
      const bindings: (string | number)[] = [];

      if (search && search.trim() !== "") {
        const like = `%${search.trim()}%`;
        conditions.push("(s.name LIKE ? OR s.surname LIKE ? OR s.email LIKE ?)");
        bindings.push(like, like, like);
      }

      if (classId) {
        conditions.push("s.class_id = ?");
        bindings.push(Number.parseInt(classId, 10));
      }

      if (schoolId !== null) {
        conditions.push("c.school_id = ?");
        bindings.push(schoolId);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countStmt = db.prepare<unknown[], { count: number }>(
        `SELECT COUNT(*) as count
         FROM student s
         LEFT JOIN class c ON c.id = s.class_id
         LEFT JOIN grade g ON g.id = s.grade_id
         LEFT JOIN parent p ON p.id = s.parent_id
         ${whereSql}`,
      );
      const { count } = countStmt.get(bindings) ?? { count: 0 };

      const stmt = db.prepare<unknown[], SqliteStudentRow>(
        `SELECT
           s.id as id,
           s.username as username,
           s.name as name,
           s.surname as surname,
           s.email as email,
           s.phone as phone,
           s.address as address,
           s.img as img,
           c.name as class_name,
           g.level as grade_level,
           p.name as parent_name,
           p.surname as parent_surname,
           p.phone as parent_phone
         FROM student s
         LEFT JOIN class c ON c.id = s.class_id
         LEFT JOIN grade g ON g.id = s.grade_id
         LEFT JOIN parent p ON p.id = s.parent_id
         ${whereSql}
         ORDER BY s.created_at DESC
         LIMIT ? OFFSET ?`,
      );

      const rows = stmt.all([...bindings, limit, offset]);

      const data: StudentListItem[] = rows.map((row) => {
        const parent: StudentListItem["parent"] =
          row.parent_name !== null && row.parent_surname !== null && row.parent_phone !== null
            ? {
                name: row.parent_name,
                surname: row.parent_surname,
                phone: row.parent_phone,
              }
            : null;

        return {
          id: row.id,
          username: row.username,
          name: row.name,
          surname: row.surname,
          email: row.email,
          phone: row.phone,
          address: row.address,
          img: row.img,
          class: { name: row.class_name ?? "" },
          grade: { level: row.grade_level ?? 0 },
          parent,
          _count: {
            attendances: 0,
            results: 0,
          },
        };
      });

      return {
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: count === 0 ? 0 : Math.ceil(count / limit),
        },
      };
    },
  };

  return repo;
}

export async function getStudentsRepository(): Promise<StudentsRepository> {
  if (isDesktopRuntime()) {
    return getSqliteStudentsRepository();
  }

  return getPrismaStudentsRepository();
}
