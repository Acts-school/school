import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import type { BaseRole } from "@/lib/rbac";

interface MyStudentFeeListItem {
  id: string;
  studentId: string;
  student: {
    id: string;
    name: string;
    surname: string;
    class: { id: number; name: string };
    grade: { id: number; level: number };
  };
  structure: {
    id: number;
    name: string;
  } | null;
  feeCategory: {
    id: number;
    name: string;
  } | null;
  amountDue: number;
  amountPaid: number;
  status: string;
  dueDate: Date | null;
  createdAt: Date;
}

type StringFilter = {
  contains: string;
  mode: "insensitive";
};

type NameOrStructureFilter = {
  student?: {
    name?: StringFilter;
    surname?: StringFilter;
  };
  structure?: {
    name?: StringFilter;
  };
  feeCategory?: {
    name?: StringFilter;
  };
};

type MyStudentFeeWhereInput = {
  studentId?: string;
  student?: {
    parentId?: string;
    class?: {
      supervisorId?: string;
    };
  };
  term?: "TERM1" | "TERM2" | "TERM3";
  academicYear?: number;
  OR?: NameOrStructureFilter[];
};

type MyStudentFeeFindManyArgs = {
  where: MyStudentFeeWhereInput;
  select: {
    id: true;
    studentId: true;
    student: {
      select: {
        id: true;
        name: true;
        surname: true;
        class: { select: { id: true; name: true } };
        grade: { select: { id: true; level: true } };
      };
    };
    structure: {
      select: {
        id: true;
        name: true;
      };
    } | null;
    feeCategory: {
      select: {
        id: true;
        name: true;
      };
    } | null;
    amountDue: true;
    amountPaid: true;
    status: true;
    dueDate: true;
    createdAt: true;
  };
  take: number;
  skip: number;
  orderBy: { createdAt: "desc" | "asc" };
};

type MyStudentFeeCountArgs = {
  where: MyStudentFeeWhereInput;
};

type MyStudentFeePrisma = {
  studentFee: {
    findMany: (args: MyStudentFeeFindManyArgs) => Promise<MyStudentFeeListItem[]>;
    count: (args: MyStudentFeeCountArgs) => Promise<number>;
  };
  $transaction: (ops: ReadonlyArray<Promise<unknown>>) => Promise<Array<unknown>>;
};

const myStudentFeePrisma = prisma as unknown as MyStudentFeePrisma;

interface ApiResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<MyStudentFeeListItem> | { error: string }>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as BaseRole;
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const page = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;
    const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10) || 10;
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") ?? "";
    const termParam = searchParams.get("term");
    const yearParam = searchParams.get("year");
    const studentIdParam = searchParams.get("studentId");

    let termFilter: "TERM1" | "TERM2" | "TERM3" | undefined;
    if (termParam) {
      if (termParam === "TERM1" || termParam === "TERM2" || termParam === "TERM3") {
        termFilter = termParam;
      } else {
        return NextResponse.json({ error: "Invalid term" }, { status: 400 });
      }
    }

    let yearFilter: number | undefined;
    if (yearParam) {
      const parsedYear = Number.parseInt(yearParam, 10);
      if (Number.isNaN(parsedYear)) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
      }
      yearFilter = parsedYear;
    }

    let whereBase: MyStudentFeeWhereInput;

    if (role === "student") {
      // Students can only ever see their own rows; ignore any provided studentId param
      whereBase = { studentId: userId };
    } else if (role === "parent") {
      // Parents are constrained by parentId and may optionally narrow to one child
      whereBase = { student: { parentId: userId } };
    } else if (role === "teacher") {
      // Teachers are constrained by supervised class and may optionally narrow to one student
      whereBase = { student: { class: { supervisorId: userId } } };
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where: MyStudentFeeWhereInput = {
      ...whereBase,
      ...(studentIdParam && role !== "student" ? { studentId: studentIdParam } : {}),
      ...(termFilter ? { term: termFilter } : {}),
      ...(yearFilter !== undefined ? { academicYear: yearFilter } : {}),
      ...(search
        ? {
            OR: [
              {
                student: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                student: {
                  surname: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                structure: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                feeCategory: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [feesResult, totalCountResult] = await myStudentFeePrisma.$transaction([
      myStudentFeePrisma.studentFee.findMany({
        where,
        select: {
          id: true,
          studentId: true,
          student: {
            select: {
              id: true,
              name: true,
              surname: true,
              class: { select: { id: true, name: true } },
              grade: { select: { id: true, level: true } },
            },
          },
          structure: {
            select: {
              id: true,
              name: true,
            },
          },
          feeCategory: {
            select: {
              id: true,
              name: true,
            },
          },
          amountDue: true,
          amountPaid: true,
          status: true,
          dueDate: true,
          createdAt: true,
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      myStudentFeePrisma.studentFee.count({ where }),
    ]);

    const fees = feesResult as MyStudentFeeListItem[];
    const totalCount = totalCountResult as number;

    return NextResponse.json({
      data: fees,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching my student fees:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
