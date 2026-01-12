import { describe, it, expect, vi } from "vitest";

vi.mock("@prisma/client", () => {
  type FeeCategoryRow = {
    id: number;
    name: string;
    description?: string;
    frequency: "TERMLY" | "YEARLY" | "ONE_TIME";
    isRecurring: boolean;
    isEditable: boolean;
    active: boolean;
  };

  type SchoolPaymentInfoRow = {
    name: string;
    data: unknown;
  };

  type GradeRow = {
    id: number;
    level: number;
  };

  type ClassRow = {
    id: number;
    name: string;
    gradeId: number;
  };

  type TermValue = "TERM1" | "TERM2" | "TERM3" | null;

  type ClassFeeStructureRow = {
    classId: number;
    feeCategoryId: number;
    term: TermValue;
    academicYear: number;
    amount: number;
    active: boolean;
  };

  type FeeCategoryUpsertArgsMock = {
    where: { name: string };
    update: {
      description?: string;
      frequency: "TERMLY" | "YEARLY" | "ONE_TIME";
      isRecurring: boolean;
      active: boolean;
    };
    create: {
      name: string;
      description?: string;
      frequency: "TERMLY" | "YEARLY" | "ONE_TIME";
      isRecurring: boolean;
      active: boolean;
      isEditable: boolean;
    };
  };

  type FeeCategoryFindManyArgsMock = {
    where?: { name?: { in?: string[] } };
  };

  type SchoolPaymentInfoUpsertArgsMock = {
    where: { name: string };
    update: { data: unknown };
    create: { name: string; data: unknown };
  };

  type GradeUpsertArgsMock = {
    where: { level: number };
    update: Record<string, never>;
    create: { level: number };
  };

  type ClassUpsertArgsMock = {
    where: { name: string };
    update: Record<string, never>;
    create: { name: string; capacity: number; gradeId: number };
  };

  type ClassFindUniqueArgsMock = {
    where: { name: string };
  };

  type ClassFindManyArgsMock = {
    where: { name: { in: string[] } };
  };

  type ClassFeeStructureUpsertArgsMock = {
    where: {
      classId_feeCategoryId_term_academicYear: {
        classId: number;
        feeCategoryId: number;
        term: TermValue;
        academicYear: number;
      };
    };
    update: { amount: number; active: boolean };
    create: {
      classId: number;
      feeCategoryId: number;
      term: TermValue;
      academicYear: number;
      amount: number;
      active: boolean;
    };
  };

  const state = {
    feeCategories: [] as FeeCategoryRow[],
    schoolPaymentInfos: [] as SchoolPaymentInfoRow[],
    grades: [] as GradeRow[],
    classes: [] as ClassRow[],
    classFeeStructures: [] as ClassFeeStructureRow[],
  };

  let nextFeeCategoryId = 1;
  let nextGradeId = 1;
  let nextClassId = 1;

  class PrismaClientMock {
    feeCategory = {
      upsert: async (args: FeeCategoryUpsertArgsMock): Promise<void> => {
        const existing = state.feeCategories.find((c) => c.name === args.where.name);
        if (existing) {
          existing.description = args.update.description ?? existing.description;
          existing.frequency = args.update.frequency;
          existing.isRecurring = args.update.isRecurring;
          existing.active = args.update.active;
          return;
        }

        const row: FeeCategoryRow = {
          id: nextFeeCategoryId,
          name: args.create.name,
          description: args.create.description,
          frequency: args.create.frequency,
          isRecurring: args.create.isRecurring,
          active: args.create.active,
          isEditable: args.create.isEditable,
        };
        nextFeeCategoryId += 1;
        state.feeCategories.push(row);
      },
      findMany: async (args: FeeCategoryFindManyArgsMock): Promise<FeeCategoryRow[]> => {
        const names = args.where?.name?.in;
        if (!names) {
          return state.feeCategories.slice();
        }
        return state.feeCategories.filter((c) => names.includes(c.name));
      },
    };

    schoolPaymentInfo = {
      upsert: async (args: SchoolPaymentInfoUpsertArgsMock): Promise<void> => {
        const existing = state.schoolPaymentInfos.find((row) => row.name === args.where.name);
        if (existing) {
          existing.data = args.update.data;
          return;
        }
        state.schoolPaymentInfos.push({ name: args.create.name, data: args.create.data });
      },
    };

    grade = {
      upsert: async (args: GradeUpsertArgsMock): Promise<GradeRow> => {
        const existing = state.grades.find((g) => g.level === args.where.level);
        if (existing) {
          return existing;
        }
        const row: GradeRow = { id: nextGradeId, level: args.create.level };
        nextGradeId += 1;
        state.grades.push(row);
        return row;
      },
    };

    class = {
      upsert: async (args: ClassUpsertArgsMock): Promise<void> => {
        const existing = state.classes.find((cls) => cls.name === args.where.name);
        if (existing) {
          return;
        }
        const row: ClassRow = { id: nextClassId, name: args.create.name, gradeId: args.create.gradeId };
        nextClassId += 1;
        state.classes.push(row);
      },
      findUnique: async (args: ClassFindUniqueArgsMock): Promise<ClassRow | null> => {
        const found = state.classes.find((cls) => cls.name === args.where.name);
        return found ?? null;
      },
      findMany: async (args: ClassFindManyArgsMock): Promise<Array<{ id: number; name: string }>> => {
        const names = args.where.name.in;
        return state.classes
          .filter((cls) => names.includes(cls.name))
          .map((cls) => ({ id: cls.id, name: cls.name }));
      },
    };

    classFeeStructure = {
      upsert: async (args: ClassFeeStructureUpsertArgsMock): Promise<void> => {
        const key = args.where.classId_feeCategoryId_term_academicYear;
        const existingIndex = state.classFeeStructures.findIndex(
          (row) =>
            row.classId === key.classId &&
            row.feeCategoryId === key.feeCategoryId &&
            row.term === key.term &&
            row.academicYear === key.academicYear,
        );

        if (existingIndex >= 0) {
          state.classFeeStructures[existingIndex] = {
            ...state.classFeeStructures[existingIndex],
            amount: args.update.amount,
            active: args.update.active,
          };
          return;
        }

        const row: ClassFeeStructureRow = {
          classId: args.create.classId,
          feeCategoryId: args.create.feeCategoryId,
          term: args.create.term,
          academicYear: args.create.academicYear,
          amount: args.create.amount,
          active: args.create.active,
        };
        state.classFeeStructures.push(row);
      },
    };
  }

  return {
    PrismaClient: PrismaClientMock,
    __prismaMockState: state,
  };
});

// Import after vi.mock so that seedFees uses the mocked PrismaClient
import { seedFees } from "../../prisma/seed-fees";
import { __prismaMockState } from "@prisma/client";

const PRIMARY_CLASSES: ReadonlyArray<string> = ["1A", "2A", "3A", "4A", "5A", "6A"];

describe("seedFees integration with C2B mapping context", () => {
  it("creates Kingdom Bank PayBill 529914/51029 and Primary Term1 totals including Computer Studies", async () => {
    await seedFees();

    const kingdom = __prismaMockState.schoolPaymentInfos.find((row) => row.name === "Kingdom Bank");
    expect(kingdom).toBeDefined();
    expect(kingdom?.data).toEqual({ paybill: 529914, account: "51029" });

    const computerStudiesCategory = __prismaMockState.feeCategories.find((cat) => cat.name === "Computer Studies");
    expect(computerStudiesCategory).toBeDefined();

    const targetClass = __prismaMockState.classes.find((cls) => PRIMARY_CLASSES.includes(cls.name));
    expect(targetClass).toBeDefined();
    const classId = targetClass!.id;

    const academicYear = 2025;

    const term1Structures = __prismaMockState.classFeeStructures.filter(
      (row) => row.classId === classId && row.term === "TERM1" && row.academicYear === academicYear,
    );

    const totalMinor = term1Structures.reduce((sum, row) => sum + row.amount, 0);
    expect(totalMinor).toBe(990000);

    const computerStudiesRow = term1Structures.find((row) => row.feeCategoryId === computerStudiesCategory!.id);
    expect(computerStudiesRow).toBeDefined();
    expect(computerStudiesRow?.amount).toBe(150000);
  });
});
