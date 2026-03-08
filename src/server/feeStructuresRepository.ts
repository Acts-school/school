import type { NextRequest } from "next/server";
import type { Prisma } from "../../prisma/client";

import { isDesktopRuntime } from "./runtime";
import { getSqliteDb } from "./sqliteDb";

export type Term = "TERM1" | "TERM2" | "TERM3";

export interface FeeStructureItem {
  id: number;
  classId: number;
  feeCategoryId: number;
  term: Term | null;
  academicYear: number | null;
  amount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  feeCategory?: { id: number; name: string };
}

export interface FeeStructureQuery {
  classId?: number;
  academicYear?: number | null;
}

export interface UpsertLine {
  feeCategoryId: number;
  term: Term | null;
  amountMinor: number;
  active?: boolean | undefined;
}

export interface UpsertPayload {
  classId: number;
  year: number;
  lines: UpsertLine[];
}

interface FeeStructuresRepository {
  list(params: FeeStructureQuery): Promise<FeeStructureItem[]>;
  upsert(payload: UpsertPayload, userId: string): Promise<FeeStructureItem[]>;
}

async function getPrismaFeeStructuresRepository(): Promise<FeeStructuresRepository> {
  const prismaModule = await import("@/lib/prisma");
  const prisma = prismaModule.default;

  const repo: FeeStructuresRepository = {
    async list(params) {
      const { classId, academicYear } = params;

      const where: Prisma.ClassFeeStructureWhereInput = {};
      if (classId !== undefined) where.classId = classId;
      if (academicYear !== undefined) where.academicYear = academicYear;

      const rows = await prisma.classFeeStructure.findMany({
        where,
        select: {
          id: true,
          classId: true,
          feeCategoryId: true,
          term: true,
          academicYear: true,
          amount: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          feeCategory: { select: { id: true, name: true } },
        },
        orderBy: { id: "asc" },
      });

      return rows as FeeStructureItem[];
    },

    async upsert(payload, userId) {
      const { classId, year, lines } = payload;
      const results: FeeStructureItem[] = [];

      // Use transaction function instead of promise array for complex operations
      await prisma.$transaction(async (tx) => {
        for (const line of lines) {
          const where = {
            classId,
            feeCategoryId: line.feeCategoryId,
            term: line.term ?? null,
            academicYear: year,
          } as const;

          // Pre-read current rows
          const beforeAll = await tx.classFeeStructure.findMany({
            where: { classId: where.classId, academicYear: where.academicYear },
            select: {
              id: true,
              classId: true,
              feeCategoryId: true,
              term: true,
              academicYear: true,
              amount: true,
              active: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          // Perform upsert
          const after = await tx.classFeeStructure.upsert({
            where: {
              classId_feeCategoryId_term_academicYear: {
                classId: where.classId,
                feeCategoryId: where.feeCategoryId,
                term: where.term,
                academicYear: where.academicYear,
              },
            } as any, // Type assertion to handle nullable fields in compound key
            update: { amount: line.amountMinor, active: line.active ?? true },
            create: {
              classId,
              feeCategoryId: line.feeCategoryId,
              term: line.term ?? null,
              academicYear: year,
              amount: line.amountMinor,
              active: line.active ?? true,
            },
            select: {
              id: true,
              classId: true,
              feeCategoryId: true,
              term: true,
              academicYear: true,
              amount: true,
              active: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          const before = beforeAll.find(
            (r: any) =>
              r.feeCategoryId === where.feeCategoryId && r.term === where.term
          ) ?? null;
          
          results.push(after as FeeStructureItem);

          // Create audit log
          await tx.auditLog.create({
            data: {
              actorUserId: userId,
              entity: "class_fee_structure",
              entityId: `${classId}:${year}`,
              oldValue: before as any, // Type assertion for JSON field
              newValue: {
                id: after.id,
                classId: after.classId,
                feeCategoryId: after.feeCategoryId,
                term: after.term,
                academicYear: after.academicYear,
                amount: after.amount,
                active: after.active,
              } as any, // Type assertion for JSON field
            },
          });
        }
      });

      return results;
    },
  };

  return repo;
}

interface SqliteFeeStructureRow {
  id: number;
  class_id: number;
  fee_category_id: number;
  term: string | null;
  academic_year: number | null;
  amount: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  fee_category_name?: string;
}

function getSqliteFeeStructuresRepository(): FeeStructuresRepository {
  const db = getSqliteDb();

  const repo: FeeStructuresRepository = {
    async list(params) {
      const { classId, academicYear } = params;

      const conditions: string[] = [];
      const bindings: (string | number | null)[] = [];

      if (classId !== undefined) {
        conditions.push("cfs.class_id = ?");
        bindings.push(classId);
      }

      if (academicYear !== undefined) {
        conditions.push("cfs.academic_year = ?");
        bindings.push(academicYear ?? null);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const stmt = db.prepare<unknown[], SqliteFeeStructureRow>(
        `SELECT
           cfs.id as id,
           cfs.class_id as class_id,
           cfs.fee_category_id as fee_category_id,
           cfs.term as term,
           cfs.academic_year as academic_year,
           cfs.amount as amount,
           cfs.active as active,
           cfs.created_at as created_at,
           cfs.updated_at as updated_at,
           fc.id as fee_category_id,
           fc.name as fee_category_name
         FROM class_fee_structure cfs
         LEFT JOIN fee_category fc ON fc.id = cfs.fee_category_id
         ${whereSql}
         ORDER BY cfs.id ASC`,
      );

      const rows = stmt.all(bindings);

      return rows.map((row: any) => ({
        id: row.id as number,
        classId: row.class_id as number,
        feeCategoryId: row.fee_category_id as number,
        term: row.term as Term | null,
        academicYear: row.academic_year as number | null,
        amount: row.amount as number,
        active: Boolean(row.active) as boolean,
        createdAt: new Date(row.created_at) as Date,
        updatedAt: new Date(row.updated_at) as Date,
        feeCategory: row.fee_category_name
          ? { id: row.fee_category_id as number, name: row.fee_category_name as string }
          : undefined,
      } as FeeStructureItem));
    },

    async upsert(payload, userId) {
      const { classId, year, lines } = payload;
      const results: FeeStructureItem[] = [];

      // SQLite doesn't support complex transactions like Prisma, so we'll do a simpler approach
      for (const line of lines) {
        const where = {
          classId,
          feeCategoryId: line.feeCategoryId,
          term: line.term ?? null,
          academicYear: year,
        };

        // Check if exists
        const checkStmt = db.prepare<unknown[], { id: number }>(
          `SELECT id FROM class_fee_structure 
           WHERE class_id = ? AND fee_category_id = ? AND term = ? AND academic_year = ?`
        );
        const existing = checkStmt.get(
          where.classId,
          where.feeCategoryId,
          where.term,
          where.academicYear
        );

        if (existing) {
          // Update
          const updateStmt = db.prepare(
            `UPDATE class_fee_structure 
             SET amount = ?, active = ?, updated_at = datetime('now')
             WHERE id = ?`
          );
          updateStmt.run(line.amountMinor, line.active ?? true, existing.id);
        } else {
          // Insert
          const insertStmt = db.prepare(
            `INSERT INTO class_fee_structure 
             (class_id, fee_category_id, term, academic_year, amount, active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
          );
          insertStmt.run(
            where.classId,
            where.feeCategoryId,
            where.term,
            where.academicYear,
            line.amountMinor,
            line.active ?? true
          );
        }

        // Get the result
        const resultStmt = db.prepare<unknown[], SqliteFeeStructureRow>(
          `SELECT 
             cfs.id, cfs.class_id, cfs.fee_category_id, cfs.term, cfs.academic_year,
             cfs.amount, cfs.active, cfs.created_at, cfs.updated_at,
             fc.id as fee_category_id, fc.name as fee_category_name
           FROM class_fee_structure cfs
           LEFT JOIN fee_category fc ON fc.id = cfs.fee_category_id
           WHERE cfs.class_id = ? AND cfs.fee_category_id = ? AND cfs.term = ? AND cfs.academic_year = ?`
        );
        const row = resultStmt.get(
          where.classId,
          where.feeCategoryId,
          where.term,
          where.academicYear
        );

        if (row) {
          results.push({
            id: row.id as number,
            classId: row.class_id as number,
            feeCategoryId: row.fee_category_id as number,
            term: row.term as Term | null,
            academicYear: row.academic_year as number | null,
            amount: row.amount as number,
            active: Boolean(row.active) as boolean,
            createdAt: new Date(row.created_at) as Date,
            updatedAt: new Date(row.updated_at) as Date,
            feeCategory: row.fee_category_name
              ? { id: row.fee_category_id as number, name: row.fee_category_name as string }
              : undefined,
          } as FeeStructureItem);
        }
      }

      return results;
    },
  };

  return repo;
}

export async function getFeeStructuresRepository(): Promise<FeeStructuresRepository> {
  if (isDesktopRuntime()) {
    return getSqliteFeeStructuresRepository();
  }

  return getPrismaFeeStructuresRepository();
}
