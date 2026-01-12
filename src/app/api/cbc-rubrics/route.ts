import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

type RubricCriterionDto = {
  id: number;
  level: "BELOW_EXPECTATIONS" | "APPROACHING_EXPECTATIONS" | "MEETING_EXPECTATIONS";
  descriptor: string;
};

type RubricDto = {
  id: number;
  name: string;
  description: string | null;
  stage: string;
  gradeLevel: number;
  criteria: RubricCriterionDto[];
};

export const GET = async (): Promise<NextResponse<RubricDto[] | { error: string }>> => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rubrics = await prisma.rubric.findMany({
      where: {
        active: true,
      },
      include: {
        criteria: {
          orderBy: {
            id: "asc",
          },
        },
      },
      orderBy: [
        { stage: "asc" },
        { gradeLevel: "asc" },
        { name: "asc" },
      ],
    });

    const result: RubricDto[] = rubrics.map((rubric) => ({
      id: rubric.id,
      name: rubric.name,
      description: rubric.description ?? null,
      stage: rubric.stage,
      gradeLevel: rubric.gradeLevel,
      criteria: rubric.criteria.map((criterion) => ({
        id: criterion.id,
        level: criterion.level,
        descriptor: criterion.descriptor,
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching CBC rubrics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
