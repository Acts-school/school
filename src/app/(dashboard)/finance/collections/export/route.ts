import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

type StudentFeeRow = {
  id: string;
  amountDue: number;
  amountPaid: number;
  term: TermLiteral | null;
  academicYear: number | null;
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
};

const financePrisma = prisma as unknown as FinancePrisma;

export async function GET(request: Request): Promise<Response> {
  await ensurePermission("fees.read");

  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const termParam = url.searchParams.get("term");
  const gradeIdParam = url.searchParams.get("gradeId");

  const { academicYear: defaultYear, term: defaultTerm } = await getSchoolSettingsDefaults();

  const year = (() => {
    if (!yearParam) return defaultYear;
    const parsed = Number.parseInt(yearParam, 10);
    return Number.isNaN(parsed) ? defaultYear : parsed;
  })();

  const termFilter: TermLiteral | undefined = (() => {
    if (termParam === "TERM1" || termParam === "TERM2" || termParam === "TERM3") {
      return termParam;
    }
    return defaultTerm;
  })();

  const gradeIdNumber = gradeIdParam ? Number.parseInt(gradeIdParam, 10) : undefined;

  const where: StudentFeeWhereInput = {
    academicYear: year,
    ...(termFilter ? { term: termFilter } : {}),
  };

  if (typeof gradeIdNumber === "number" && !Number.isNaN(gradeIdNumber)) {
    where.student = { gradeId: gradeIdNumber };
  }

  const rows = await financePrisma.studentFee.findMany({
    where,
    select: {
      id: true,
      amountDue: true,
      amountPaid: true,
      term: true,
      academicYear: true,
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

  type GroupKey = string;
  type GroupValue = {
    gradeId: number | null;
    classId: number | null;
    gradeLevel: number | null;
    className: string | null;
    due: number;
    paid: number;
    outstanding: number;
  };

  const groups = new Map<GroupKey, GroupValue>();

  for (const row of rows) {
    const gradeId = row.student.grade?.id ?? row.student.gradeId ?? null;
    const classId = row.student.class?.id ?? row.student.classId ?? null;
    const key: GroupKey = `${gradeId ?? "none"}|${classId ?? "none"}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        gradeId,
        classId,
        gradeLevel: row.student.grade?.level ?? null,
        className: row.student.class?.name ?? null,
        due: 0,
        paid: 0,
        outstanding: 0,
      };
      groups.set(key, group);
    }

    const outstanding = Math.max(row.amountDue - row.amountPaid, 0);
    group.due += row.amountDue;
    group.paid += row.amountPaid;
    group.outstanding += outstanding;
  }

  const escapeCsv = (v: string): string => '"' + v.replace(/"/g, '""') + '"';

  const header = [
    "gradeId",
    "gradeLevel",
    "classId",
    "className",
    "due_minor",
    "paid_minor",
    "outstanding_minor",
    "due_kes",
    "paid_kes",
    "outstanding_kes",
  ];

  const lines: string[] = [header.join(",")];

  const sorted = Array.from(groups.values()).sort((a, b) => {
    const aGrade = a.gradeLevel ?? 0;
    const bGrade = b.gradeLevel ?? 0;
    if (aGrade !== bGrade) return aGrade - bGrade;
    const aClass = a.className ?? "";
    const bClass = b.className ?? "";
    return aClass.localeCompare(bClass);
  });

  for (const g of sorted) {
    lines.push(
      [
        g.gradeId !== null ? String(g.gradeId) : "",
        g.gradeLevel !== null ? String(g.gradeLevel) : "",
        g.classId !== null ? String(g.classId) : "",
        escapeCsv(g.className ?? ""),
        String(g.due),
        String(g.paid),
        String(g.outstanding),
        ((g.due ?? 0) / 100).toFixed(2),
        ((g.paid ?? 0) / 100).toFixed(2),
        ((g.outstanding ?? 0) / 100).toFixed(2),
      ].join(","),
    );
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
