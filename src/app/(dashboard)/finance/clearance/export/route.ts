import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";

// GET /finance/clearance/export -> CSV
export async function GET(request: Request): Promise<Response> {
  await ensurePermission("fees.read");

  type TermLiteral = "TERM1" | "TERM2" | "TERM3";

  type StudentPick = {
    id: string;
    name: string;
    surname: string;
    class: { name: string } | null;
    grade: { level: number } | null;
  };

  type StudentFeeRow = {
    id: string;
    studentId: string;
    student: StudentPick;
    term: TermLiteral | null;
    academicYear: number | null;
    amountDue: number;
    amountPaid: number;
  };

  type StudentFeeFindManyArgs = {
    where?: {
      academicYear?: number;
      student?: {
        gradeId?: number;
        classId?: number;
      };
    };
    select: {
      id: true;
      studentId: true;
      student: {
        select: {
          id: true;
          name: true;
          surname: true;
          class: { select: { name: true } } | null;
          grade: { select: { level: true } } | null;
        };
      };
      term: true;
      academicYear: true;
      amountDue: true;
      amountPaid: true;
    };
  };

  type FinancePrisma = {
    studentFee: {
      findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeRow[]>;
    };
  };

  const financePrisma = prisma as unknown as FinancePrisma;

  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const gradeIdParam = url.searchParams.get("gradeId");
  const classIdParam = url.searchParams.get("classId");

  const { academicYear: defaultYear } = await getSchoolSettingsDefaults();

  const year = (() => {
    if (!yearParam) return defaultYear;
    const parsed = Number.parseInt(yearParam, 10);
    return Number.isNaN(parsed) ? defaultYear : parsed;
  })();

  const where: StudentFeeFindManyArgs["where"] = {
    academicYear: year,
  };

  const gradeIdNumber = gradeIdParam ? Number.parseInt(gradeIdParam, 10) : undefined;
  const classIdNumber = classIdParam ? Number.parseInt(classIdParam, 10) : undefined;

  if (gradeIdNumber || classIdNumber) {
    const studentFilter: { gradeId?: number; classId?: number } = {};
    if (typeof gradeIdNumber === "number" && !Number.isNaN(gradeIdNumber)) {
      studentFilter.gradeId = gradeIdNumber;
    }
    if (typeof classIdNumber === "number" && !Number.isNaN(classIdNumber)) {
      studentFilter.classId = classIdNumber;
    }
    if (Object.keys(studentFilter).length > 0) {
      where.student = studentFilter;
    }
  }

  const rows = await financePrisma.studentFee.findMany({
    where,
    select: {
      id: true,
      studentId: true,
      student: {
        select: {
          id: true,
          name: true,
          surname: true,
          class: { select: { name: true } },
          grade: { select: { level: true } },
        },
      },
      term: true,
      academicYear: true,
      amountDue: true,
      amountPaid: true,
    },
  });

  type TermLiteralNonNull = "TERM1" | "TERM2" | "TERM3";
  type TermBucket = { due: number; paid: number };
  type TermStatus = {
    label: "none" | "unpaid" | "partially_paid" | "paid";
    outstanding: number;
  };

  const allTerms: TermLiteralNonNull[] = ["TERM1", "TERM2", "TERM3"];

  const initialBucket: TermBucket = { due: 0, paid: 0 };

  const byStudent = new Map<
    string,
    {
      student: StudentPick;
      terms: Record<TermLiteralNonNull, TermBucket>;
    }
  >();

  for (const row of rows) {
    const key = row.studentId;
    let agg = byStudent.get(key);
    if (!agg) {
      const buckets: Record<TermLiteralNonNull, TermBucket> = {
        TERM1: { ...initialBucket },
        TERM2: { ...initialBucket },
        TERM3: { ...initialBucket },
      };
      agg = { student: row.student, terms: buckets };
      byStudent.set(key, agg);
    }

    const termKey: TermLiteralNonNull = (row.term ?? "TERM1") as TermLiteralNonNull;
    const bucket = agg.terms[termKey];
    bucket.due += row.amountDue;
    bucket.paid += row.amountPaid;
  }

  const computeStatus = (bucket: TermBucket): TermStatus => {
    if (bucket.due === 0 && bucket.paid === 0) {
      return { label: "none", outstanding: 0 };
    }
    if (bucket.paid <= 0) {
      return { label: "unpaid", outstanding: bucket.due };
    }
    if (bucket.paid < bucket.due) {
      return { label: "partially_paid", outstanding: bucket.due - bucket.paid };
    }
    return { label: "paid", outstanding: 0 };
  };

  const escape = (v: string): string => '"' + v.replace(/"/g, '""') + '"';

  const header = [
    "studentId",
    "student",
    "class",
    "grade",
    "term",
    "status",
    "outstanding_minor",
  ];

  const lines: string[] = [header.join(",")];

  byStudent.forEach((agg) => {
    for (const term of allTerms) {
      const bucket = agg.terms[term];
      const status = computeStatus(bucket);
      if (status.label === "none") continue;
      lines.push(
        [
          agg.student.id,
          escape(`${agg.student.name} ${agg.student.surname}`),
          escape(agg.student.class?.name ?? "-"),
          agg.student.grade ? String(agg.student.grade.level) : "-",
          term,
          status.label,
          String(status.outstanding),
        ].join(","),
      );
    }
  });

  const csv = lines.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=clearance.csv",
      "Cache-Control": "no-store",
    },
  });
}
