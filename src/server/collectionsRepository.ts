import { isDesktopRuntime } from "./runtime";
import { getSqliteDb } from "./sqliteDb";

export type TermLiteral = "TERM1" | "TERM2" | "TERM3";
export type FeeFrequency = "TERMLY" | "YEARLY" | "ONE_TIME";

export interface GradeItem {
  id: number;
  level: number;
}

export interface FeeCategoryItem {
  id: number;
  name: string;
  frequency: FeeFrequency;
}

export interface StudentFeeCollectionItem {
  id: string;
  amountDue: number;
  amountPaid: number;
  term: TermLiteral | null;
  academicYear: number;
  feeCategoryId: number | null;
  feeCategory: {
    id: number;
    name: string;
  } | null;
  student: {
    gradeId: number | null;
    classId: number | null;
    grade: {
      id: number;
      level: number;
    } | null;
    class: {
      id: number;
      name: string;
    } | null;
  };
}

export interface CollectionsListParams {
  academicYear: number;
  term?: TermLiteral | null;
  gradeId?: number | null;
}

export interface CollectionsRepository {
  listGrades(): Promise<GradeItem[]>;
  listFeeCategories(): Promise<FeeCategoryItem[]>;
  listStudentFees(params: CollectionsListParams): Promise<StudentFeeCollectionItem[]>;
}

async function getPrismaCollectionsRepository(): Promise<CollectionsRepository> {
  const prismaModule = await import("../lib/prisma");
  const prisma = prismaModule.default;

  // Type definitions for Prisma facade
  type GradeFindManyArgs = {
    select: { id: true; level: true };
    orderBy: { level: "asc" };
  };

  type FeeCategoryFindManyArgs = {
    where: { active: true; frequency: "TERMLY" };
    select: { id: true; name: true; frequency: true };
    orderBy: { name: "asc" };
  };

  type StudentFeeFindManyArgs = {
    where: {
      academicYear: number;
      term?: TermLiteral | null;
      student?: {
        gradeId?: number | null;
      };
    };
    select: {
      id: true;
      amountDue: true;
      amountPaid: true;
      term: true;
      academicYear: true;
      feeCategoryId: true;
      feeCategory: {
        select: {
          id: true;
          name: true;
        };
      };
      student: {
        select: {
          gradeId: true;
          classId: true;
          grade: { select: { id: true; level: true } };
          class: { select: { id: true; name: true } };
        };
      };
    };
  };

  type PrismaFacade = {
    grade: {
      findMany: (args: GradeFindManyArgs) => Promise<GradeItem[]>;
    };
    feeCategory: {
      findMany: (args: FeeCategoryFindManyArgs) => Promise<FeeCategoryItem[]>;
    };
    studentFee: {
      findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeCollectionItem[]>;
    };
  };

  const financePrisma = prisma as unknown as PrismaFacade;

  return {
    async listGrades() {
      return await prisma.grade.findMany({
        select: { id: true, level: true },
        orderBy: { level: "asc" },
      });
    },

    async listFeeCategories() {
      return await financePrisma.feeCategory.findMany({
        where: { active: true, frequency: "TERMLY" },
        select: { id: true, name: true, frequency: true },
        orderBy: { name: "asc" },
      });
    },

    async listStudentFees(params) {
      const { academicYear, term, gradeId } = params;
      
      const where: any = {
        academicYear,
      };
      
      if (term) where.term = term;
      if (gradeId !== undefined && gradeId !== null) {
        where.student = { gradeId };
      }

      return await financePrisma.studentFee.findMany({
        where,
        select: {
          id: true,
          amountDue: true,
          amountPaid: true,
          term: true,
          academicYear: true,
          feeCategoryId: true,
          feeCategory: {
            select: {
              id: true,
              name: true,
            },
          },
          student: {
            select: {
              gradeId: true,
              classId: true,
              grade: { select: { id: true, level: true } },
              class: { select: { id: true, name: true } },
            },
          },
        },
      });
    },
  };
}

function getSqliteCollectionsRepository(): CollectionsRepository {
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

    async listFeeCategories() {
      const stmt = db.prepare(`
        SELECT id, name, frequency
        FROM fee_category
        WHERE active = 1 AND frequency = 'TERMLY'
        ORDER BY name ASC
      `);
      
      const rows = stmt.all() as any[];
      
      return rows.map((row) => ({
        id: row.id as number,
        name: row.name as string,
        frequency: row.frequency as FeeFrequency,
      } as FeeCategoryItem));
    },

    async listStudentFees(params) {
      const { academicYear, term, gradeId } = params;
      
      let sql = `
        SELECT 
          sf.id,
          sf.amount_due,
          sf.amount_paid,
          sf.term,
          sf.academic_year,
          sf.fee_category_id,
          fc.id as fc_id,
          fc.name as fc_name,
          s.grade_id,
          s.class_id,
          g.id as g_id,
          g.level as g_level,
          c.id as c_id,
          c.name as c_name
        FROM student_fee sf
        LEFT JOIN fee_category fc ON sf.fee_category_id = fc.id
        LEFT JOIN student s ON sf.student_id = s.id
        LEFT JOIN grade g ON s.grade_id = g.id
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
      
      const stmt = db.prepare(sql);
      const rows = stmt.all(...bindings) as any[];

      return rows.map((row) => ({
        id: row.id as string,
        amountDue: row.amount_due as number,
        amountPaid: row.amount_paid as number,
        term: row.term as TermLiteral | null,
        academicYear: row.academic_year as number,
        feeCategoryId: row.fee_category_id as number | null,
        feeCategory: row.fc_id ? {
          id: row.fc_id as number,
          name: row.fc_name as string,
        } : null,
        student: {
          gradeId: row.grade_id as number | null,
          classId: row.class_id as number | null,
          grade: row.g_id ? {
            id: row.g_id as number,
            level: row.g_level as number,
          } : null,
          class: row.c_id ? {
            id: row.c_id as number,
            name: row.c_name as string,
          } : null,
        },
      } as StudentFeeCollectionItem));
    },
  };
}

export async function getCollectionsRepository(): Promise<CollectionsRepository> {
  if (isDesktopRuntime()) {
    return getSqliteCollectionsRepository();
  } else {
    return getPrismaCollectionsRepository();
  }
}
