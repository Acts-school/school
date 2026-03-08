import { isDesktopRuntime } from "./runtime";
import { getSqliteDb } from "./sqliteDb";

export type TermLiteral = "TERM1" | "TERM2" | "TERM3";

export interface GradeItem {
  id: number;
  level: number;
}

export interface ClassItem {
  id: number;
  name: string;
}

export interface StudentFeeClearanceItem {
  id: string;
  studentId: string;
  student: {
    id: string;
    name: string;
    surname: string;
    class: {
      id: number;
      name: string;
    } | null;
  };
  amountDue: number;
  amountPaid: number;
  term: TermLiteral | null;
  academicYear: number;
}

export interface ClearanceListParams {
  academicYear: number;
  term?: TermLiteral | null;
  gradeId?: number | null;
  classId?: number | null;
  search?: string | null;
  schoolId?: number | null;
}

export interface ClearanceRepository {
  listGrades(): Promise<GradeItem[]>;
  listClasses(params: { gradeId?: number | null; schoolId?: number | null }): Promise<ClassItem[]>;
  listStudentFees(params: ClearanceListParams): Promise<StudentFeeClearanceItem[]>;
}

async function getPrismaClearanceRepository(): Promise<ClearanceRepository> {
  const prismaModule = await import("../lib/prisma");
  const prisma = prismaModule.default;

  return {
    async listGrades() {
      return await prisma.grade.findMany({
        select: { id: true, level: true },
        orderBy: { level: "asc" },
      });
    },

    async listClasses(params) {
      const { gradeId, schoolId } = params;
      
      const where: any = {};
      if (gradeId !== undefined && gradeId !== null) {
        where.gradeId = gradeId;
      }
      if (schoolId !== undefined && schoolId !== null) {
        where.schoolId = schoolId;
      }

      return await prisma.class.findMany({
        where,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    },

    async listStudentFees(params) {
      const { academicYear, term, gradeId, classId, search, schoolId } = params;
      
      const where: any = {
        academicYear,
      };
      
      if (term) where.term = term;
      
      where.student = {};
      if (gradeId !== undefined && gradeId !== null) {
        where.student.gradeId = gradeId;
      }
      if (classId !== undefined && classId !== null) {
        where.student.classId = classId;
      }
      if (schoolId !== undefined && schoolId !== null) {
        where.student.class = { schoolId };
      }
      if (search && search.trim()) {
        where.student.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { surname: { contains: search, mode: "insensitive" } },
        ];
      }

      // Type definitions for Prisma facade
      type StudentFeeFindManyArgs = {
        where: any;
        select: {
          id: true;
          studentId: true;
          student: {
            select: {
              id: true;
              name: true;
              surname: true;
              class: { select: { id: true; name: true } };
            };
          };
          amountDue: true;
          amountPaid: true;
          term: true;
          academicYear: true;
        };
      };

      type PrismaFacade = {
        studentFee: {
          findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeClearanceItem[]>;
        };
      };

      const financePrisma = prisma as unknown as PrismaFacade;

      return await financePrisma.studentFee.findMany({
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
            },
          },
          amountDue: true,
          amountPaid: true,
          term: true,
          academicYear: true,
        },
      });
    },
  };
}

function getSqliteClearanceRepository(): ClearanceRepository {
  const db = getSqliteDb();

  return {
    async listGrades() {
      const stmt = db.prepare(`
        SELECT id, level
        FROM grade
        ORDER BY level ASC
      `);
      
      const rows = stmt.all() as any[];
      
      return rows.map((row) => ({
        id: row.id as number,
        level: row.level as number,
      } as GradeItem));
    },

    async listClasses(params) {
      const { gradeId, schoolId } = params;
      
      let sql = `
        SELECT id, name
        FROM class
        WHERE 1=1
      `;
      
      const bindings: any[] = [];
      
      if (gradeId !== undefined && gradeId !== null) {
        sql += ` AND grade_id = ?`;
        bindings.push(gradeId);
      }
      
      if (schoolId !== undefined && schoolId !== null) {
        sql += ` AND school_id = ?`;
        bindings.push(schoolId);
      }
      
      sql += ` ORDER BY name ASC`;
      
      const stmt = db.prepare(sql);
      const rows = stmt.all(...bindings) as any[];
      
      return rows.map((row) => ({
        id: row.id as number,
        name: row.name as string,
      } as ClassItem));
    },

    async listStudentFees(params) {
      const { academicYear, term, gradeId, classId, search, schoolId } = params;
      
      let sql = `
        SELECT 
          sf.id,
          sf.student_id,
          s.id as s_id,
          s.name as s_name,
          s.surname as s_surname,
          c.id as c_id,
          c.name as c_name,
          sf.amount_due,
          sf.amount_paid,
          sf.term,
          sf.academic_year
        FROM student_fee sf
        LEFT JOIN student s ON sf.student_id = s.id
        LEFT JOIN class c ON s.class_id = c.id
        WHERE sf.academic_year = ?
      `;
      
      const bindings: any[] = [academicYear];
      
      if (term) {
        sql += ` AND sf.term = ?`;
        bindings.push(term);
      }
      
      if (gradeId !== undefined && gradeId !== null) {
        sql += ` AND s.grade_id = ?`;
        bindings.push(gradeId);
      }
      
      if (classId !== undefined && classId !== null) {
        sql += ` AND s.class_id = ?`;
        bindings.push(classId);
      }
      
      if (schoolId !== undefined && schoolId !== null) {
        sql += ` AND c.school_id = ?`;
        bindings.push(schoolId);
      }
      
      if (search && search.trim()) {
        sql += ` AND (s.name LIKE ? OR s.surname LIKE ?)`;
        const searchTerm = `%${search.trim()}%`;
        bindings.push(searchTerm, searchTerm);
      }
      
      const stmt = db.prepare(sql);
      const rows = stmt.all(...bindings) as any[];

      return rows.map((row) => ({
        id: row.id as string,
        studentId: row.student_id as string,
        student: {
          id: row.s_id as string,
          name: row.s_name as string,
          surname: row.s_surname as string,
          class: row.c_id ? {
            id: row.c_id as number,
            name: row.c_name as string,
          } : null,
        },
        amountDue: row.amount_due as number,
        amountPaid: row.amount_paid as number,
        term: row.term as TermLiteral | null,
        academicYear: row.academic_year as number,
      } as StudentFeeClearanceItem));
    },
  };
}

export async function getClearanceRepository(): Promise<ClearanceRepository> {
  if (isDesktopRuntime()) {
    return getSqliteClearanceRepository();
  } else {
    return getPrismaClearanceRepository();
  }
}
