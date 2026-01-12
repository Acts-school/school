import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

interface StudentFeeListItem {
  id: string;
  studentId: string;
  student: {
    id: string;
    name: string;
    surname: string;
    class: { id: number; name: string };
    grade: { id: number; level: number };
  };
  structureId: number | null;
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

type StudentNameFilter = {
  student: {
    name?: StringFilter;
    surname?: StringFilter;
  };
};

type StudentFeeWhereInput = {
  structureId: number;
  OR?: StudentNameFilter[];
};

type StudentFeeFindManyArgs = {
  where: StudentFeeWhereInput;
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
    structureId: true;
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

type StudentFeeCountArgs = {
  where: StudentFeeWhereInput;
};

type StudentFeePrisma = {
  studentFee: {
    findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeListItem[]>;
    count: (args: StudentFeeCountArgs) => Promise<number>;
  };
  $transaction: (ops: ReadonlyArray<Promise<unknown>>) => Promise<Array<unknown>>;
};

const studentFeePrisma = prisma as unknown as StudentFeePrisma;

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
): Promise<NextResponse<ApiResponse<StudentFeeListItem> | { error: string }>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const structureIdParam = searchParams.get("structureId");
    if (!structureIdParam) {
      return NextResponse.json({ error: "structureId is required" }, { status: 400 });
    }

    const structureId = Number.parseInt(structureIdParam, 10);
    if (Number.isNaN(structureId)) {
      return NextResponse.json({ error: "Invalid structureId" }, { status: 400 });
    }

    const page = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;
    const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10) || 10;
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") ?? "";

    const where: StudentFeeWhereInput = {
      structureId,
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
            ],
          }
        : {}),
    };

    const [feesResult, totalCountResult] = await studentFeePrisma.$transaction([
      studentFeePrisma.studentFee.findMany({
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
          structureId: true,
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
      studentFeePrisma.studentFee.count({ where }),
    ]);

    const fees = feesResult as StudentFeeListItem[];
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
    console.error("Error fetching student fees:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
