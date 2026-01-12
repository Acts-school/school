import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

type SloOption = {
  id: number;
  code: string | null;
  description: string;
  learningAreaName: string;
  strandName: string;
  subStrandName: string;
};

export const GET = async (): Promise<NextResponse<SloOption[] | { error: string }>> => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const slos = await prisma.specificLearningOutcome.findMany({
      include: {
        subStrand: {
          include: {
            strand: {
              include: {
                learningArea: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    const result: SloOption[] = slos.map((slo) => ({
      id: slo.id,
      code: slo.code ?? null,
      description: slo.description,
      learningAreaName: slo.subStrand.strand.learningArea.name,
      strandName: slo.subStrand.strand.name,
      subStrandName: slo.subStrand.name,
    }));

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching CBC SLOs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
