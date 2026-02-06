import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import ExcelJS from "exceljs";

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

type FeeFrequencyLiteral = "TERMLY" | "YEARLY" | "ONE_TIME";

type ClassKeyInfo = {
  gradeId: number | null;
  classId: number | null;
  gradeLevel: number | null;
  className: string | null;
};

type CategoryTotals = {
  due: number;
  outstanding: number;
};

type PivotTotalsByTerm = Partial<Record<TermLiteral, Map<number, CategoryTotals>>>;

type FeeCategoryRow = {
  id: number;
  name: string;
  frequency: FeeFrequencyLiteral;
};

type GroupValue = {
  info: ClassKeyInfo;
  byTerm: PivotTotalsByTerm;
};

type StudentFeeRow = {
  id: string;
  amountDue: number;
  amountPaid: number;
  term: TermLiteral | null;
  academicYear: number | null;
  feeCategoryId: number | null;
  feeCategory: { id: number; name: string } | null;
  student: {
    gradeId: number | null;
    classId: number | null;
    grade: { id: number; level: number } | null;
    class: { id: number; name: string } | null;
  };
};

type StudentFeeWhereInput = {
  academicYear: number;
  term?: TermLiteral;
  student?: {
    gradeId?: number;
  };
};

type StudentFeeFindManyArgs = {
  where: StudentFeeWhereInput;
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
        grade: { select: { id: true; level: true } } | null;
        class: { select: { id: true; name: true } } | null;
      };
    };
  };
};

type FinancePrisma = {
  studentFee: {
    findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeRow[]>;
  };
  feeCategory: {
    findMany: (args: {
      where?: { active?: boolean; frequency?: FeeFrequencyLiteral };
      select: { id: true; name: true; frequency: true };
      orderBy?: { name: "asc" | "desc" };
    }) => Promise<FeeCategoryRow[]>;
  };
};

const financePrisma = prisma as unknown as FinancePrisma;

const getCategoryTotals = (
  pivot: PivotTotalsByTerm,
  term: TermLiteral,
  categoryId: number,
): CategoryTotals => {
  const termMap = pivot[term];
  if (!termMap) {
    return { due: 0, outstanding: 0 };
  }
  const totals = termMap.get(categoryId);
  if (!totals) {
    return { due: 0, outstanding: 0 };
  }
  return totals;
};

const escapeCsv = (v: string): string => `"${v.replace(/"/g, '""')}"`;

const sanitizeForColumnId = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const termLabel = (term: TermLiteral): string => {
  if (term === "TERM1") return "Term 1";
  if (term === "TERM2") return "Term 2";
  return "Term 3";
};

export async function GET(request: Request): Promise<Response> {
  await ensurePermission("fees.read");

  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const termParam = url.searchParams.get("term");
  const gradeIdParam = url.searchParams.get("gradeId");
  const formatParam = url.searchParams.get("format");

  const { academicYear: defaultYear } = await getSchoolSettingsDefaults();

  const year = (() => {
    if (!yearParam) return defaultYear;
    const parsed = Number.parseInt(yearParam, 10);
    return Number.isNaN(parsed) ? defaultYear : parsed;
  })();

  const selectedTerm: "" | TermLiteral = (() => {
    if (termParam === "TERM1" || termParam === "TERM2" || termParam === "TERM3") {
      return termParam;
    }
    if (termParam === "") {
      return "";
    }
    // When term is not provided, treat as "all terms" for exports.
    return "";
  })();

  const termFilter: TermLiteral | undefined =
    selectedTerm === "" ? undefined : selectedTerm;

  const gradeIdNumber = gradeIdParam ? Number.parseInt(gradeIdParam, 10) : undefined;

  const where: StudentFeeWhereInput = {
    academicYear: year,
    ...(termFilter ? { term: termFilter } : {}),
  };

  if (typeof gradeIdNumber === "number" && !Number.isNaN(gradeIdNumber)) {
    where.student = { gradeId: gradeIdNumber };
  }

  const [feeCategories, rows] = await Promise.all([
    financePrisma.feeCategory.findMany({
      where: { active: true, frequency: "TERMLY" },
      select: { id: true, name: true, frequency: true },
      orderBy: { name: "asc" },
    }),
    financePrisma.studentFee.findMany({
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
    }),
  ]);

  const groups = new Map<string, GroupValue>();

  const displayedCategoryIds = new Set<number>(feeCategories.map((category) => category.id));

  for (const row of rows) {
    const gradeId = row.student.grade?.id ?? row.student.gradeId ?? null;
    const classId = row.student.class?.id ?? row.student.classId ?? null;
    const key = `${gradeId ?? "none"}|${classId ?? "none"}`;

    let group = groups.get(key);
    if (!group) {
      const info: ClassKeyInfo = {
        gradeId,
        classId,
        gradeLevel: row.student.grade?.level ?? null,
        className: row.student.class?.name ?? null,
      };
      group = {
        info,
        byTerm: {},
      };
      groups.set(key, group);
    }

    const categoryId = row.feeCategoryId;
    if (categoryId === null || !displayedCategoryIds.has(categoryId)) {
      // Only include TERMLY / displayed categories in the pivoted table.
      // eslint-disable-next-line no-continue
      continue;
    }

    const rowTerm = row.term;
    if (rowTerm !== "TERM1" && rowTerm !== "TERM2" && rowTerm !== "TERM3") {
      // Ignore rows without a concrete term when building the per-term pivot.
      // eslint-disable-next-line no-continue
      continue;
    }

    if (!group.byTerm[rowTerm]) {
      group.byTerm[rowTerm] = new Map<number, CategoryTotals>();
    }

    const termMap = group.byTerm[rowTerm] as Map<number, CategoryTotals>;
    const outstanding = Math.max(row.amountDue - row.amountPaid, 0);
    const existing = termMap.get(categoryId);
    if (existing) {
      existing.due += row.amountDue;
      existing.outstanding += outstanding;
    } else {
      termMap.set(categoryId, {
        due: row.amountDue,
        outstanding,
      });
    }
  }

  const termOrder: TermLiteral[] = ["TERM1", "TERM2", "TERM3"];
  const activeTerms: TermLiteral[] = termFilter ? [termFilter] : termOrder;

  const header: string[] = ["gradeId", "gradeLevel", "classId", "className"];

  for (const term of activeTerms) {
    const termPrefix = term.toLowerCase();
    for (const category of feeCategories) {
      const categoryIdPart = sanitizeForColumnId(category.name);
      const base = `${termPrefix}_${categoryIdPart}`;
      header.push(
        `${base}_due_minor`,
        `${base}_outstanding_minor`,
        `${base}_due_kes`,
        `${base}_outstanding_kes`,
      );
    }
  }

  const lines: string[] = [header.join(",")];

  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const aGrade = a.info.gradeLevel ?? 0;
    const bGrade = b.info.gradeLevel ?? 0;
    if (aGrade !== bGrade) return aGrade - bGrade;
    const aClass = a.info.className ?? "";
    const bClass = b.info.className ?? "";
    return aClass.localeCompare(bClass);
  });

  const totalsByTermCategory: PivotTotalsByTerm = {};

  for (const group of sortedGroups) {
    for (const term of termOrder) {
      const termMap = group.byTerm[term];
      if (!termMap) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (!totalsByTermCategory[term]) {
        totalsByTermCategory[term] = new Map<number, CategoryTotals>();
      }

      const globalTermMap = totalsByTermCategory[term] as Map<number, CategoryTotals>;

      for (const [categoryId, catTotals] of termMap.entries()) {
        const existing = globalTermMap.get(categoryId);
        if (existing) {
          existing.due += catTotals.due;
          existing.outstanding += catTotals.outstanding;
        } else {
          globalTermMap.set(categoryId, {
            due: catTotals.due,
            outstanding: catTotals.outstanding,
          });
        }
      }
    }
  }

  for (const group of sortedGroups) {
    const rowValues: string[] = [];

    rowValues.push(
      group.info.gradeId !== null ? String(group.info.gradeId) : "",
      group.info.gradeLevel !== null ? String(group.info.gradeLevel) : "",
      group.info.classId !== null ? String(group.info.classId) : "",
      escapeCsv(group.info.className ?? ""),
    );

    for (const term of activeTerms) {
      for (const category of feeCategories) {
        const totals = getCategoryTotals(group.byTerm, term, category.id);
        const dueMinor = totals.due;
        const outstandingMinor = totals.outstanding;
        rowValues.push(
          String(dueMinor),
          String(outstandingMinor),
          (dueMinor / 100).toFixed(2),
          (outstandingMinor / 100).toFixed(2),
        );
      }
    }

    lines.push(rowValues.join(","));
  }

  if (formatParam === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Collections");

    const totalColumns = 2 + activeTerms.length * feeCategories.length * 2;
    const headerRow1Values = new Array<string>(totalColumns).fill("");
    const headerRow2Values = new Array<string>(totalColumns).fill("");
    const headerRow3Values = new Array<string>(totalColumns).fill("");

    headerRow1Values[0] = "Grade";
    headerRow1Values[1] = "Class";

    const termSpan = feeCategories.length * 2;

    activeTerms.forEach((term, termIndex) => {
      const termText = termLabel(term);
      const termStartCol = 3 + termIndex * termSpan;
      headerRow1Values[termStartCol - 1] = termText;

      feeCategories.forEach((category, categoryIndex) => {
        const categoryStartCol = termStartCol + categoryIndex * 2;
        headerRow2Values[categoryStartCol - 1] = category.name;
        headerRow3Values[categoryStartCol - 1] = "Total Due (KES)";
        headerRow3Values[categoryStartCol] = "Outstanding (KES)";
      });
    });

    const headerRow1 = worksheet.addRow(headerRow1Values);
    const headerRow2 = worksheet.addRow(headerRow2Values);
    const headerRow3 = worksheet.addRow(headerRow3Values);

    worksheet.mergeCells(1, 1, 3, 1);
    worksheet.mergeCells(1, 2, 3, 2);

    activeTerms.forEach((term, termIndex) => {
      const termStartCol = 3 + termIndex * termSpan;
      const termEndCol = termStartCol + termSpan - 1;
      worksheet.mergeCells(1, termStartCol, 1, termEndCol);

      feeCategories.forEach((_, categoryIndex) => {
        const categoryStartCol = termStartCol + categoryIndex * 2;
        const categoryEndCol = categoryStartCol + 1;
        worksheet.mergeCells(2, categoryStartCol, 2, categoryEndCol);
      });
    });

    const headerRows = [headerRow1, headerRow2, headerRow3];
    headerRows.forEach((row, rowIndex) => {
      row.font = { bold: true };
      row.eachCell((cell, colNumber) => {
        const isClassColumn = colNumber === 2;
        const horizontal = isClassColumn ? "left" : "right";
        cell.alignment = {
          horizontal,
          vertical: "middle",
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowIndex === 2 ? "FFF3F4F6" : "FFEFF6FF" },
        };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFCBD5F5" } },
        };
      });
    });

    worksheet.views = [{ state: "frozen", ySplit: 3 }];

    const numericColumnIndexes: number[] = [];
    for (let columnIndex = 1; columnIndex <= totalColumns; columnIndex += 1) {
      if (columnIndex !== 2) {
        numericColumnIndexes.push(columnIndex);
      }
    }

    for (const group of sortedGroups) {
      const rowValues: (string | number)[] = [];

      rowValues.push(group.info.gradeLevel ?? "", group.info.className ?? "");

      for (const term of activeTerms) {
        for (const category of feeCategories) {
          const totals = getCategoryTotals(group.byTerm, term, category.id);
          const dueKes = Number((totals.due / 100).toFixed(2));
          const outstandingKes = Number((totals.outstanding / 100).toFixed(2));
          rowValues.push(dueKes, outstandingKes);
        }
      }

      worksheet.addRow(rowValues);
    }

    const totalRowValues: (string | number)[] = ["Total", ""];

    for (const term of activeTerms) {
      for (const category of feeCategories) {
        const totals = getCategoryTotals(totalsByTermCategory, term, category.id);
        const dueKes = Number((totals.due / 100).toFixed(2));
        const outstandingKes = Number((totals.outstanding / 100).toFixed(2));
        totalRowValues.push(dueKes, outstandingKes);
      }
    }

    const totalRow = worksheet.addRow(totalRowValues);
    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FF9CA3AF" } },
      };
    });

    for (const columnIndex of numericColumnIndexes) {
      const column = worksheet.getColumn(columnIndex);
      const currentAlignment = column.alignment ?? {};
      column.alignment = { ...currentAlignment, horizontal: "right" };
    }

    const lastRowNumber = worksheet.rowCount;
    for (let rowNumber = 4; rowNumber < lastRowNumber; rowNumber += 1) {
      if (rowNumber % 2 !== 0) {
        // Leave odd rows with default background.
        // eslint-disable-next-line no-continue
        continue;
      }
      const row = worksheet.getRow(rowNumber);
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9FAFB" },
      };
    }

    const columns = worksheet.columns ?? [];
    columns.forEach((column) => {
      if (!column) {
        return;
      }

      let maxLength = 0;

      if (typeof column.eachCell === "function") {
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value;
          if (cellValue === null || cellValue === undefined) {
            return;
          }
          const asString = typeof cellValue === "string" ? cellValue : cellValue.toString();
          if (asString.length > maxLength) {
            maxLength = asString.length;
          }
        });
      }

      // Provide a sensible default width if the column is empty.
      column.width = maxLength > 0 ? maxLength + 2 : 10;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=collections.xlsx",
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = lines.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=collections.csv",
      "Cache-Control": "no-store",
    },
  });
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';
