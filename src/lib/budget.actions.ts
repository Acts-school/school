"use server";

import { revalidatePath } from "next/cache";
import prisma from "./prisma";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";

export type ImportBudgetCsvInput = {
  academicYear: number;
  label: string;
  csv: string;
};

export type ImportBudgetCsvState = {
  success: boolean;
  error: boolean;
  message?: string;
};

const MONTH_COLUMN_COUNT = 12;

const normalizeName = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const parseAmountCellToMinor = (raw: string | undefined): number => {
  if (!raw) {
    return 0;
  }
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-") {
    return 0;
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  // CSV is in KES major units; DB stores minor units
  return Math.round(numeric * 100);
};

type BudgetYearRow = {
  id: number;
  academicYear: number;
};

type BudgetPrisma = {
  budgetYear: {
    findFirst: (args: {
      where: { academicYear: number; schoolId?: number | null };
    }) => Promise<BudgetYearRow | null>;
    create: (args: {
      data: {
        academicYear: number;
        label: string;
        status: "DRAFT" | "APPROVED" | "ARCHIVED";
        notes?: string;
        schoolId: number | null;
      };
    }) => Promise<BudgetYearRow>;
  };
};

const budgetPrisma = prisma as unknown as BudgetPrisma;

export const importBudgetFromCsv = async (
  _state: ImportBudgetCsvState,
  data: ImportBudgetCsvInput,
): Promise<ImportBudgetCsvState> => {
  try {
    await ensurePermission(["budget.write"]);

    const academicYear = data.academicYear;
    if (!Number.isFinite(academicYear)) {
      return { success: false, error: true, message: "Invalid academic year" };
    }

    const { schoolId } = await getCurrentSchoolContext();

    if (schoolId === null) {
      return { success: false, error: true, message: "Select a school before importing a budget" };
    }

    const lines = data.csv
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return { success: false, error: true, message: "CSV content is empty" };
    }

    // Find or create a BudgetYear for this academic year and school.
    // If one already exists, we reuse it and append items/sections as needed.
    const existingYear = await budgetPrisma.budgetYear.findFirst({
      where: {
        academicYear,
        schoolId,
      },
    });

    const targetYear =
      existingYear ??
      (await budgetPrisma.budgetYear.create({
        data: {
          academicYear,
          label: data.label,
          status: "DRAFT",
          notes: "Imported from CSV",
          schoolId,
        },
      }));

    // Pre-create our logical sections only if they do not already exist
    const existingSections = await prisma.budgetSection.findMany({
      where: { budgetYearId: targetYear.id },
    });

    const hasOverheads = existingSections.some((s) => s.name === "Operating Overheads");
    const hasStaff = existingSections.some((s) => s.name === "Staff salaries - Current");
    const hasOther = existingSections.some((s) => s.name === "Other Budgets");

    const sectionCreateOps: Array<Promise<unknown>> = [];

    if (!hasOverheads) {
      sectionCreateOps.push(
        prisma.budgetSection.create({
          data: {
            budgetYearId: targetYear.id,
            name: "Operating Overheads",
            sortOrder: 1,
          },
        }),
      );
    }

    if (!hasStaff) {
      sectionCreateOps.push(
        prisma.budgetSection.create({
          data: {
            budgetYearId: targetYear.id,
            name: "Staff salaries - Current",
            sortOrder: 2,
          },
        }),
      );
    }

    if (!hasOther) {
      sectionCreateOps.push(
        prisma.budgetSection.create({
          data: {
            budgetYearId: targetYear.id,
            name: "Other Budgets",
            sortOrder: 3,
          },
        }),
      );
    }

    if (sectionCreateOps.length > 0) {
      await Promise.all(sectionCreateOps);
    }

    const allSections = await prisma.budgetSection.findMany({
      where: { budgetYearId: targetYear.id },
    });

    const overheadsSection = allSections.find((s) => s.name === "Operating Overheads");
    const staffSection = allSections.find((s) => s.name === "Staff salaries - Current");
    const otherSection = allSections.find((s) => s.name === "Other Budgets");

    if (!overheadsSection || !staffSection || !otherSection) {
      return {
        success: false,
        error: true,
        message: "Failed to prepare budget sections for import.",
      };
    }

    type LogicalSection = "overheads" | "staff" | "other";

    let currentSection: LogicalSection = "overheads";

    const rawStaffList = await prisma.staff.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const staffByName = new Map<string, string>();
    rawStaffList.forEach((staff) => {
      const fullName = `${staff.firstName ?? ""} ${staff.lastName ?? ""}`;
      const normalized = normalizeName(fullName);
      if (normalized.length > 0) {
        staffByName.set(normalized, staff.id);
      }
    });

    const budgetItemOps: Array<Promise<unknown>> = [];

    // Helper to choose Prisma section based on logical section
    const resolveSectionId = (logical: LogicalSection): number => {
      if (logical === "staff") return staffSection.id;
      if (logical === "other") return otherSection.id;
      return overheadsSection.id;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line === "" || line.startsWith("EMMANUEL ACT ACADEMY")) {
        continue;
      }
      if (line.startsWith("OUR PROPOSED BUDGET")) {
        continue;
      }

      const cells = line.split(",");
      const itemLabelRaw = cells[0]?.trim() ?? "";

      if (itemLabelRaw === "" || itemLabelRaw.toUpperCase() === "ITEM") {
        continue;
      }

      const normalizedItemLabel = itemLabelRaw.trim();
      const normalizedUpper = normalizedItemLabel.toUpperCase();

      // Section switches
      if (normalizedUpper.startsWith("STAFF SALARIES")) {
        currentSection = "staff";
        continue;
      }
      if (normalizedUpper.startsWith("OTHER BUDGETS")) {
        currentSection = "other";
        continue;
      }
      if (normalizedUpper === "TOTAL" || normalizedUpper === "GRAND TOTAL") {
        // Skip total rows
        continue;
      }

      // Stop if we reach an obvious footer row (very defensive)
      if (normalizedItemLabel === "") {
        continue;
      }

      const monthAmountsMinor: number[] = [];
      for (let monthIndex = 0; monthIndex < MONTH_COLUMN_COUNT; monthIndex += 1) {
        const cell = cells[1 + monthIndex];
        const minor = parseAmountCellToMinor(cell);
        monthAmountsMinor.push(minor);
      }

      const allZero = monthAmountsMinor.every((value) => value === 0);
      if (allZero) {
        continue;
      }

      const explanation = cells[13]?.trim() ?? undefined;

      const logicalSection: LogicalSection = currentSection;

      let kind: "OVERHEAD" | "STAFF" | "INCOME" | "OTHER" = "OVERHEAD";
      let category: string | null = null;

      if (logicalSection === "staff") {
        kind = "STAFF";
        category = "Staff Salary";
      } else if (logicalSection === "other") {
        // Heuristic: treat fee/tuition/income-like rows as INCOME; others remain OTHER.
        const incomeKeywords: readonly string[] = [
          "FEE",
          "FEES",
          "TUITION",
          "INCOME",
          "REVENUE",
        ];
        const isIncomeLike = incomeKeywords.some((keyword) =>
          normalizedUpper.includes(keyword),
        );

        if (isIncomeLike) {
          kind = "INCOME";
          category = "Fee Income";
        } else {
          kind = "OTHER";
          category = normalizedItemLabel;
        }
      } else {
        // Overheads: use the item label as the category so expenses can match it.
        category = normalizedItemLabel;
      }

      let staffId: string | null = null;
      if (logicalSection === "staff") {
        const normalizedNameKey = normalizeName(itemLabelRaw);
        let matchedStaffId = staffByName.get(normalizedNameKey);

        if (!matchedStaffId) {
          // Automatically create a Staff record for this name with role OTHER.
          const rawName = itemLabelRaw.trim();
          const parts = rawName.split(/\s+/);
          const firstName = parts[0] ?? "Unknown";
          const lastName = parts.slice(1).join(" ") || firstName;

          const createdStaff = await prisma.staff.create({
            data: {
              firstName,
              lastName,
              role: "OTHER",
              active: true,
            },
            select: { id: true },
          });

          matchedStaffId = createdStaff.id;
          staffByName.set(normalizedNameKey, matchedStaffId);
        }

        staffId = matchedStaffId;
      }

      const sectionId = resolveSectionId(logicalSection);

      const createItemAndAmounts = prisma.budgetItem
        .create({
          data: {
            budgetSectionId: sectionId,
            name: normalizedItemLabel,
            kind,
            category,
            notes: explanation && explanation.length > 0 ? explanation : null,
            staffId,
            amounts: {
              create: monthAmountsMinor
                .map((minor, index) => ({ month: index + 1, amount: minor }))
                .filter((entry) => entry.amount > 0),
            },
          },
        })
        .then(() => undefined);

      budgetItemOps.push(createItemAndAmounts);
    }

    if (budgetItemOps.length > 0) {
      await Promise.all(budgetItemOps);
    }

    revalidatePath("/finance/budget");
    return { success: true, error: false, message: "Budget CSV imported" };
  } catch (e) {
    console.error(e);
    return { success: false, error: true, message: "Failed to import budget CSV" };
  }
};
