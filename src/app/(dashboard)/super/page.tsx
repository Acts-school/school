import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentSchoolContext } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import { SuperSchoolScopeButton } from "@/components/SuperSchoolScopeButton";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

interface SchoolSummaryRow {
  id: number;
  name: string;
  _count: {
    students: number;
    teachers: number;
    classes: number;
  };
}

interface StudentFeeForSuperRow {
  amountDue: number;
  amountPaid: number;
  student: {
    class: {
      schoolId: number | null;
    } | null;
  } | null;
}

interface ExpenseForSuperRow {
  amount: number;
  schoolId: number | null;
}

type SchoolFindManyArgs = {
  select: {
    id: true;
    name: true;
    _count: {
      select: {
        students: true;
        teachers: true;
        classes: true;
      };
    };
  };
  orderBy: { name: "asc" };
};

type StudentFeeFindManyArgs = {
  where: {
    academicYear: number;
    term?: TermLiteral | null;
  };
  select: {
    amountDue: true;
    amountPaid: true;
    student: {
      select: {
        class: {
          select: {
            schoolId: true;
          };
        };
      };
    };
  };
};

type ExpenseFindManyArgs = {
  select: {
    amount: true;
    schoolId: true;
  };
};

type SuperAdminPrisma = {
  school: {
    findMany: (args: SchoolFindManyArgs) => Promise<SchoolSummaryRow[]>;
  };
  studentFee: {
    findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeForSuperRow[]>;
  };
  expense: {
    findMany: (args: ExpenseFindManyArgs) => Promise<ExpenseForSuperRow[]>;
  };
};

const superAdminPrisma = prisma as unknown as SuperAdminPrisma;

const SuperAdminDashboard = async () => {
  const { isSuperAdmin } = await getCurrentSchoolContext();

  if (!isSuperAdmin) {
    redirect("/admin");
  }

  const { academicYear, term } = await getSchoolSettingsDefaults();

  const [schools, studentFees, expenses] = await Promise.all([
    superAdminPrisma.school.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            students: true,
            teachers: true,
            classes: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    superAdminPrisma.studentFee.findMany({
      where: {
        academicYear,
        ...(term ? { term } : {}),
      },
      select: {
        amountDue: true,
        amountPaid: true,
        student: {
          select: {
            class: {
              select: {
                schoolId: true,
              },
            },
          },
        },
      },
    }),
    superAdminPrisma.expense.findMany({
      select: {
        amount: true,
        schoolId: true,
      },
    }),
  ]);

  const feesBySchool = new Map<number, { due: number; paid: number }>();

  studentFees.forEach((row) => {
    const schoolId = row.student?.class?.schoolId;
    if (typeof schoolId !== "number") {
      return;
    }
    const current = feesBySchool.get(schoolId) ?? { due: 0, paid: 0 };
    current.due += row.amountDue;
    current.paid += row.amountPaid;
    feesBySchool.set(schoolId, current);
  });

  const expensesBySchool = new Map<number, number>();

  expenses.forEach((row) => {
    const schoolId = row.schoolId;
    if (typeof schoolId !== "number") {
      return;
    }
    const current = expensesBySchool.get(schoolId) ?? 0;
    expensesBySchool.set(schoolId, current + row.amount);
  });

  const totalStudents = schools.reduce((sum, school) => sum + school._count.students, 0);
  const totalTeachers = schools.reduce((sum, school) => sum + school._count.teachers, 0);
  const totalClasses = schools.reduce((sum, school) => sum + school._count.classes, 0);

  let totalFeesDue = 0;
  let totalFeesPaid = 0;

  feesBySchool.forEach((value) => {
    totalFeesDue += value.due;
    totalFeesPaid += value.paid;
  });

  let totalExpenses = 0;

  expensesBySchool.forEach((value) => {
    totalExpenses += value;
  });

  const totalFeesOutstanding = Math.max(totalFeesDue - totalFeesPaid, 0);

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Group Overview (Super Admin)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 flex flex-col gap-2 bg-white shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Total community</h2>
          <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Students</span>
              <span className="font-semibold">{totalStudents}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Teachers</span>
              <span className="font-semibold">{totalTeachers}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Classes</span>
              <span className="font-semibold">{totalClasses}</span>
            </div>
          </div>
        </div>
        <div className="border rounded-lg p-4 flex flex-col gap-2 bg-white shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Total finance (current year)</h2>
          <div className="mt-1 grid grid-cols-4 gap-2 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500">Fees billed</span>
              <span className="font-semibold text-[11px]">
                {formatKES(totalFeesDue)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500">Fees paid</span>
              <span className="font-semibold text-[11px]">
                {formatKES(totalFeesPaid)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500">Fees outstanding</span>
              <span className="font-semibold text-[11px]">
                {formatKES(totalFeesOutstanding)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500">Expenses</span>
              <span className="font-semibold text-[11px]">
                {formatKES(totalExpenses)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {schools.map((school) => (
          <div
            key={school.id}
            className="border rounded-lg p-4 flex flex-col gap-2 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{school.name}</h2>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                School #{school.id}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Students</span>
                <span className="font-semibold">{school._count.students}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Teachers</span>
                <span className="font-semibold">{school._count.teachers}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Classes</span>
                <span className="font-semibold">{school._count.classes}</span>
              </div>
            </div>
            <div className="mt-3 border-t pt-2 grid grid-cols-4 gap-2 text-xs">
              {(() => {
                const fee = feesBySchool.get(school.id) ?? { due: 0, paid: 0 };
                const expensesTotal = expensesBySchool.get(school.id) ?? 0;
                const outstanding = Math.max(fee.due - fee.paid, 0);
                return (
                  <>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500">Fees billed</span>
                      <span className="font-semibold text-[11px]">
                        {formatKES(fee.due)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500">Fees paid</span>
                      <span className="font-semibold text-[11px]">
                        {formatKES(fee.paid)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500">Fees outstanding</span>
                      <span className="font-semibold text-[11px]">
                        {formatKES(outstanding)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500">Expenses</span>
                      <span className="font-semibold text-[11px]">
                        {formatKES(expensesTotal)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
            <SuperSchoolScopeButton schoolId={school.id} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
