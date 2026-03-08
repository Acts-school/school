import { isDesktopRuntime } from "./runtime";
import { getSqliteDb } from "./sqliteDb";

export type FeeFrequency = "TERMLY" | "YEARLY" | "ONE_TIME";

export interface FeeCategoryItem {
  id: number;
  name: string;
  active: boolean;
  frequency: FeeFrequency;
}

export interface FeeCategoryListParams {
  activeOnly?: boolean;
}

export interface CreateFeeCategoryPayload {
  name: string;
  description?: string | null;
  frequency: FeeFrequency;
}

export interface UpdateFeeCategoryPayload {
  id: number;
  name?: string;
  active?: boolean;
}

export interface FeeCategoriesRepository {
  list(params: FeeCategoryListParams): Promise<FeeCategoryItem[]>;
  create(payload: CreateFeeCategoryPayload): Promise<FeeCategoryItem>;
  update(payload: UpdateFeeCategoryPayload): Promise<FeeCategoryItem>;
  findById(id: number): Promise<FeeCategoryItem | null>;
  hasActiveFeeStructures(feeCategoryId: number): Promise<boolean>;
}

async function getPrismaFeeCategoriesRepository(): Promise<FeeCategoriesRepository> {
  const prismaModule = await import("../lib/prisma");
  const prisma = prismaModule.default;

  // Type definitions for Prisma facade
  type FeeCategoryRow = { id: number; name: string; active: boolean; frequency: FeeFrequency };
  type FeeCategoryFindManyArgs = {
    where?: { active?: boolean };
    select?: { id: true; name: true; active: true; frequency: true };
    orderBy?: { name: "asc" | "desc" };
  };
  type FeeCategoryCreateArgs = {
    data: {
      name: string;
      description?: string | null;
      isRecurring: boolean;
      frequency: FeeFrequency;
      isEditable: boolean;
      active: boolean;
    };
    select: { id: true; name: true; active: true; frequency: true };
  };
  type FeeCategoryUpdateArgs = {
    where: { id: number };
    data: { name?: string; active?: boolean };
    select: { id: true; name: true; active: true; frequency: true };
  };
  type FeeCategoryFindUniqueArgs = {
    where: { id: number };
    select: { id: true; name: true; active: true; frequency: true };
  };
  type ClassFeeStructureFindFirstArgs = {
    where: { feeCategoryId: number; active?: boolean };
    select: { id: true };
  };

  type PrismaFacade = {
    feeCategory: {
      findMany: (args: FeeCategoryFindManyArgs) => Promise<FeeCategoryRow[]>;
      create: (args: FeeCategoryCreateArgs) => Promise<FeeCategoryRow>;
      update: (args: FeeCategoryUpdateArgs) => Promise<FeeCategoryRow>;
      findUnique: (args: FeeCategoryFindUniqueArgs) => Promise<FeeCategoryRow | null>;
    };
    classFeeStructure: {
      findFirst: (args: ClassFeeStructureFindFirstArgs) => Promise<{ id: number } | null>;
    };
  };

  const db = prisma as unknown as PrismaFacade;

  return {
    async list(params) {
      const { activeOnly } = params;
      
      const where: NonNullable<FeeCategoryFindManyArgs["where"]> = {};
      if (activeOnly) where.active = true;

      const rows = await db.feeCategory.findMany({ 
        where, 
        select: { id: true, name: true, active: true, frequency: true }, 
        orderBy: { name: "asc" } 
      });
      
      return rows as FeeCategoryItem[];
    },

    async create(payload) {
      const { name, description, frequency } = payload;
      const isRecurring = frequency !== "ONE_TIME";

      const created = await db.feeCategory.create({
        data: {
          name,
          ...(typeof description === "string" && description.trim().length > 0 ? { description } : {}),
          isRecurring,
          frequency,
          isEditable: true,
          active: true,
        },
        select: { id: true, name: true, active: true, frequency: true },
      });

      return created as FeeCategoryItem;
    },

    async update(payload) {
      const { id, name, active } = payload;

      const updated = await db.feeCategory.update({
        where: { id },
        data: {
          ...(typeof name === "string" ? { name } : {}),
          ...(typeof active === "boolean" ? { active } : {}),
        },
        select: { id: true, name: true, active: true, frequency: true },
      });

      return updated as FeeCategoryItem;
    },

    async findById(id) {
      const existing = await db.feeCategory.findUnique({ 
        where: { id }, 
        select: { id: true, name: true, active: true, frequency: true } 
      });
      
      return existing as FeeCategoryItem | null;
    },

    async hasActiveFeeStructures(feeCategoryId) {
      const linked = await db.classFeeStructure.findFirst({
        where: { feeCategoryId, active: true },
        select: { id: true },
      });
      
      return linked !== null;
    },
  };
}

function getSqliteFeeCategoriesRepository(): FeeCategoriesRepository {
  const db = getSqliteDb();

  return {
    async list(params) {
      const { activeOnly } = params;
      
      let sql = `SELECT id, name, active, frequency FROM fee_category`;
      const bindings: any[] = [];
      
      if (activeOnly) {
        sql += ` WHERE active = ?`;
        bindings.push(1);
      }
      
      sql += ` ORDER BY name ASC`;
      
      const stmt = db.prepare(sql);
      const rows = stmt.all(...bindings);

      return rows.map((row: any) => ({
        id: row.id as number,
        name: row.name as string,
        active: Boolean(row.active) as boolean,
        frequency: row.frequency as FeeFrequency,
      } as FeeCategoryItem));
    },

    async create(payload) {
      const { name, description, frequency } = payload;
      const isRecurring = frequency !== "ONE_TIME";

      const stmt = db.prepare(`
        INSERT INTO fee_category (name, description, is_recurring, frequency, is_editable, active)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        name,
        description || null,
        isRecurring ? 1 : 0,
        frequency,
        1, // is_editable
        1  // active
      );

      // Return the created record
      const selectStmt = db.prepare(`
        SELECT id, name, active, frequency 
        FROM fee_category 
        WHERE id = ?
      `);
      
      const row = selectStmt.get(result.lastInsertRowid) as any;
      
      return {
        id: row.id as number,
        name: row.name as string,
        active: Boolean(row.active) as boolean,
        frequency: row.frequency as FeeFrequency,
      } as FeeCategoryItem;
    },

    async update(payload) {
      const { id, name, active } = payload;
      
      const setClauses: string[] = [];
      const bindings: any[] = [];
      
      if (typeof name === "string") {
        setClauses.push("name = ?");
        bindings.push(name);
      }
      
      if (typeof active === "boolean") {
        setClauses.push("active = ?");
        bindings.push(active ? 1 : 0);
      }
      
      if (setClauses.length === 0) {
        throw new Error("No fields to update");
      }
      
      bindings.push(id);
      
      const stmt = db.prepare(`
        UPDATE fee_category 
        SET ${setClauses.join(", ")}
        WHERE id = ?
      `);
      
      stmt.run(...bindings);

      // Return the updated record
      const selectStmt = db.prepare(`
        SELECT id, name, active, frequency 
        FROM fee_category 
        WHERE id = ?
      `);
      
      const row = selectStmt.get(id) as any;
      
      return {
        id: row.id as number,
        name: row.name as string,
        active: Boolean(row.active) as boolean,
        frequency: row.frequency as FeeFrequency,
      } as FeeCategoryItem;
    },

    async findById(id) {
      const stmt = db.prepare(`
        SELECT id, name, active, frequency 
        FROM fee_category 
        WHERE id = ?
      `);
      
      const row = stmt.get(id) as any;
      
      if (!row) return null;
      
      return {
        id: row.id as number,
        name: row.name as string,
        active: Boolean(row.active) as boolean,
        frequency: row.frequency as FeeFrequency,
      } as FeeCategoryItem;
    },

    async hasActiveFeeStructures(feeCategoryId) {
      const stmt = db.prepare(`
        SELECT id 
        FROM class_fee_structure 
        WHERE fee_category_id = ? AND active = ?
        LIMIT 1
      `);
      
      const row = stmt.get(feeCategoryId, 1);
      return row !== undefined;
    },
  };
}

export async function getFeeCategoriesRepository(): Promise<FeeCategoriesRepository> {
  if (isDesktopRuntime()) {
    return getSqliteFeeCategoriesRepository();
  } else {
    return getPrismaFeeCategoriesRepository();
  }
}
