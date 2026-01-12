import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

type AgeBucketId =
  | "not_due_yet"
  | "d0_30"
  | "d31_60"
  | "d61_90"
  | "d90_plus"
  | "no_due_date";

type StudentFeeRow = {
  id: string;
  amountDue: number;
  amountPaid: number;
  dueDate: Date | null;
  term: TermLiteral | null;
  academicYear: number | null;
  student: {
    id: string;
    name: string;
    surname: string;
    grade: { id: number; level: number } | null;
    class: { id: number; name: string } | null;
  };
};

type StudentFeeWhereInput = {
  academicYear: number;
  term?: TermLiteral;
  student?: {
    gradeId?: number;
    classId?: number;
  };
};

type StudentFeeFindManyArgs = {
  where: StudentFeeWhereInput;
  select: {
    id: true;
    amountDue: true;
    amountPaid: true;
    dueDate: true;
    term: true;
    academicYear: true;
    student: {
      select: {
        id: true;
        name: true;
        surname: true;
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

const ageBucketByDays = (days: number | null): AgeBucketId => {
  if (days === null) return "no_due_date";
  if (days < 0) return "not_due_yet";
  if (days <= 30) return "d0_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90_plus";
};

export async function GET(request: Request): Promise<Response> {
  await ensurePermission("fees.read");

  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const termParam = url.searchParams.get("term");
  const gradeIdParam = url.searchParams.get("gradeId");
  const classIdParam = url.searchParams.get("classId");

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
  const classIdNumber = classIdParam ? Number.parseInt(classIdParam, 10) : undefined;

  const where: StudentFeeWhereInput = {
    academicYear: year,
    ...(termFilter ? { term: termFilter } : {}),
  };

  if (typeof gradeIdNumber === "number" && !Number.isNaN(gradeIdNumber)) {
    where.student = { ...(where.student ?? {}), gradeId: gradeIdNumber };
  }

  if (typeof classIdNumber === "number" && !Number.isNaN(classIdNumber)) {
    where.student = { ...(where.student ?? {}), classId: classIdNumber };
  }

  const rows = await financePrisma.studentFee.findMany({
    where,
    select: {
      id: true,
      amountDue: true,
      amountPaid: true,
      dueDate: true,
      term: true,
      academicYear: true,
      student: {
        select: {
          id: true,
          name: true,
          surname: true,
          grade: { select: { id: true, level: true } },
          class: { select: { id: true, name: true } },
        },
      },
    },
  });

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;

  type CsvRow = {
    studentId: string;
    studentName: string;
    gradeLevel: number | null;
    className: string | null;
    term: string;
    academicYear: number | null;
    dueDateIso: string;
    daysPastDue: number | "";
    amountDue: number;
    amountPaid: number;
    outstanding: number;
    bucket: AgeBucketId;
  };

  const csvRows: CsvRow[] = [];

  for (const row of rows) {
    const outstanding = Math.max(row.amountDue - row.amountPaid, 0);
    if (outstanding <= 0) continue;

    const dueDate = row.dueDate;
    let daysPastDue: number | null = null;
    if (dueDate instanceof Date) {
      const dueMidnight = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate(),
      ).getTime();
      daysPastDue = Math.floor((todayMidnight - dueMidnight) / msPerDay);
    }

    const bucket = ageBucketByDays(daysPastDue);

    csvRows.push({
      studentId: row.student.id,
      studentName: `${row.student.name} ${row.student.surname}`,
      gradeLevel: row.student.grade?.level ?? null,
      className: row.student.class?.name ?? null,
      term: row.term ?? "",
      academicYear: row.academicYear,
      dueDateIso: dueDate ? dueDate.toISOString() : "",
      daysPastDue: daysPastDue !== null ? daysPastDue : "",
      amountDue: row.amountDue,
      amountPaid: row.amountPaid,
      outstanding,
      bucket,
    });
  }

  const escapeCsv = (v: string): string => '"' + v.replace(/"/g, '""') + '"';

  const header = [
    "studentId",
    "studentName",
    "gradeLevel",
    "className",
    "term",
    "academicYear",
    "dueDate",
    "daysPastDue",
    "amountDue_minor",
    "amountPaid_minor",
    "outstanding_minor",
    "bucket",
  ];

  const lines: string[] = [header.join(",")];

  for (const r of csvRows) {
    lines.push(
      [
        r.studentId,
        escapeCsv(r.studentName),
        r.gradeLevel !== null ? String(r.gradeLevel) : "",
        escapeCsv(r.className ?? ""),
        r.term,
        r.academicYear !== null ? String(r.academicYear) : "",
        r.dueDateIso,
        r.daysPastDue === "" ? "" : String(r.daysPastDue),
        String(r.amountDue),
        String(r.amountPaid),
        String(r.outstanding),
        r.bucket,
      ].join(","),
    );
  }

  const csv = lines.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=aging.csv",
      "Cache-Control": "no-store",
    },
  });
}
