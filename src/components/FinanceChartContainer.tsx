import prisma from "@/lib/prisma";
import { getCurrentSchoolContext } from "@/lib/authz";
import FinanceChart, { type FinanceChartPoint } from "@/components/FinanceChart";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

type MonthName = (typeof months)[number];

const FinanceChartContainer = async () => {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  const { schoolId, isSuperAdmin } = await getCurrentSchoolContext();

  type PaymentRow = { amount: number; paidAt: Date };
  type ExpenseRow = { amount: number; date: Date };

  let payments: PaymentRow[] = [];
  let expenses: ExpenseRow[] = [];

  if (schoolId !== null) {
    [payments, expenses] = await prisma.$transaction([
      prisma.payment.findMany({
        where: {
          paidAt: {
            gte: yearStart,
            lt: yearEnd,
          },
          OR: [
            {
              studentFee: {
                student: {
                  class: {
                    schoolId,
                  },
                },
              },
            },
            {
              invoice: {
                student: {
                  class: {
                    schoolId,
                  },
                },
              },
            },
          ],
        },
        select: {
          amount: true,
          paidAt: true,
        },
      }),
      prisma.expense.findMany({
        where: {
          date: {
            gte: yearStart,
            lt: yearEnd,
          },
          schoolId,
        },
        select: {
          amount: true,
          date: true,
        },
      }),
    ]);
  } else if (isSuperAdmin) {
    [payments, expenses] = await prisma.$transaction([
      prisma.payment.findMany({
        where: {
          paidAt: {
            gte: yearStart,
            lt: yearEnd,
          },
        },
        select: {
          amount: true,
          paidAt: true,
        },
      }),
      prisma.expense.findMany({
        where: {
          date: {
            gte: yearStart,
            lt: yearEnd,
          },
        },
        select: {
          amount: true,
          date: true,
        },
      }),
    ]);
  }

  const byMonth: Record<MonthName, { income: number; expense: number }> = months.reduce(
    (acc, month) => {
      acc[month] = { income: 0, expense: 0 };
      return acc;
    },
    {} as Record<MonthName, { income: number; expense: number }>,
  );

  payments.forEach((payment) => {
    const monthIndex = new Date(payment.paidAt).getMonth();
    const monthName = months[monthIndex];
    if (!monthName) {
      return;
    }
    byMonth[monthName].income += payment.amount / 100;
  });

  expenses.forEach((expense) => {
    const monthIndex = new Date(expense.date).getMonth();
    const monthName = months[monthIndex];
    if (!monthName) {
      return;
    }
    byMonth[monthName].expense += expense.amount / 100;
  });

  const data: FinanceChartPoint[] = months.map((month) => ({
    name: month,
    income: byMonth[month].income,
    expense: byMonth[month].expense,
  }));

  return <FinanceChart data={data} />;
};

export default FinanceChartContainer;

