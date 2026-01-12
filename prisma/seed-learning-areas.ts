import { EducationStage, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type LearningAreaUpsertArgs = {
  where: {
    stage_gradeLevel_name: {
      stage: EducationStage;
      gradeLevel: number;
      name: string;
    };
  };
  update: { code: string };
  create: { name: string; code: string; stage: EducationStage; gradeLevel: number };
};

type LearningAreaFindFirstArgs = {
  where: {
    stage: EducationStage;
    gradeLevel: number;
    name: string;
  };
};

type LearningAreaRow = {
  id: number;
};

type StrandFindFirstArgs = {
  where: {
    learningAreaId: number;
    name: string;
  };
};

type StrandCreateArgs = {
  data: {
    learningAreaId: number;
    name: string;
    code?: string;
  };
};

type StrandRow = {
  id: number;
};

type SubStrandFindFirstArgs = {
  where: {
    strandId: number;
    name: string;
  };
};

type SubStrandCreateArgs = {
  data: {
    strandId: number;
    name: string;
    code?: string;
  };
};

type SubStrandRow = {
  id: number;
};

type SpecificLearningOutcomeCreateArgs = {
  data: {
    subStrandId: number;
    code?: string;
    description: string;
  };
};

type LearningAreaClient = {
  upsert: (args: LearningAreaUpsertArgs) => Promise<unknown>;
  findFirst: (args: LearningAreaFindFirstArgs) => Promise<LearningAreaRow | null>;
};

type StrandClient = {
  findFirst: (args: StrandFindFirstArgs) => Promise<StrandRow | null>;
  create: (args: StrandCreateArgs) => Promise<StrandRow>;
};

type SubStrandClient = {
  findFirst: (args: SubStrandFindFirstArgs) => Promise<SubStrandRow | null>;
  create: (args: SubStrandCreateArgs) => Promise<SubStrandRow>;
};

type SpecificLearningOutcomeClient = {
  create: (args: SpecificLearningOutcomeCreateArgs) => Promise<unknown>;
};

type CurriculumPrisma = {
  learningArea: LearningAreaClient;
  strand: StrandClient;
  subStrand: SubStrandClient;
  specificLearningOutcome: SpecificLearningOutcomeClient;
};

const curriculumPrisma = prisma as unknown as CurriculumPrisma;
const learningAreaPrisma = curriculumPrisma;

type LearningAreaSeed = {
  stage: EducationStage;
  gradeLevel: number;
  name: string;
  code: string;
};

const learningAreaSeeds: ReadonlyArray<LearningAreaSeed> = [
  // Pre-Primary (PP1 & PP2) - shared learning areas (aggregated at gradeLevel 0)
  {
    stage: EducationStage.PRE_PRIMARY,
    gradeLevel: 0,
    name: "Language Activities",
    code: "PP_LANG_ACT",
  },
  {
    stage: EducationStage.PRE_PRIMARY,
    gradeLevel: 0,
    name: "Mathematics Activities",
    code: "PP_MATH_ACT",
  },
  {
    stage: EducationStage.PRE_PRIMARY,
    gradeLevel: 0,
    name: "Creative Activities",
    code: "PP_CREATIVE_ACT",
  },
  {
    stage: EducationStage.PRE_PRIMARY,
    gradeLevel: 0,
    name: "Environmental Activities",
    code: "PP_ENV_ACT",
  },
  {
    stage: EducationStage.PRE_PRIMARY,
    gradeLevel: 0,
    name: "Religious Activities",
    code: "PP_RELIGIOUS_ACT",
  },
  {
    stage: EducationStage.PRE_PRIMARY,
    gradeLevel: 0,
    name: "Pastoral Programme of Instruction (PPI)",
    code: "PP_PPI",
  },

  // Lower Primary (Grades 1-3) - representative CBC learning areas
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 1,
    name: "English",
    code: "LP_G1_ENGLISH",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 1,
    name: "Kiswahili",
    code: "LP_G1_KISWAHILI",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 1,
    name: "Indigenous Language",
    code: "LP_G1_INDLANG",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 1,
    name: "Mathematics",
    code: "LP_G1_MATH",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 1,
    name: "Environmental Activities",
    code: "LP_G1_ENV_ACT",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 1,
    name: "Creative Activities",
    code: "LP_G1_CREATIVE_ACT",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 1,
    name: "Religious Education",
    code: "LP_G1_RE",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 2,
    name: "English",
    code: "LP_G2_ENGLISH",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 2,
    name: "Kiswahili",
    code: "LP_G2_KISWAHILI",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 2,
    name: "Indigenous Language",
    code: "LP_G2_INDLANG",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 2,
    name: "Mathematics",
    code: "LP_G2_MATH",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 2,
    name: "Environmental Activities",
    code: "LP_G2_ENV_ACT",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 2,
    name: "Creative Activities",
    code: "LP_G2_CREATIVE_ACT",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 2,
    name: "Religious Education",
    code: "LP_G2_RE",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 3,
    name: "English",
    code: "LP_G3_ENGLISH",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 3,
    name: "Kiswahili",
    code: "LP_G3_KISWAHILI",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 3,
    name: "Indigenous Language",
    code: "LP_G3_INDLANG",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 3,
    name: "Mathematics",
    code: "LP_G3_MATH",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 3,
    name: "Environmental Activities",
    code: "LP_G3_ENV_ACT",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 3,
    name: "Creative Activities",
    code: "LP_G3_CREATIVE_ACT",
  },
  {
    stage: EducationStage.LOWER_PRIMARY,
    gradeLevel: 3,
    name: "Religious Education",
    code: "LP_G3_RE",
  },

  // Upper Primary (Grades 4-6) - rationalised CBC learning areas
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 4,
    name: "English",
    code: "UP_G4_ENGLISH",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 4,
    name: "Mathematics",
    code: "UP_G4_MATH",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 4,
    name: "Kiswahili",
    code: "UP_G4_KISWAHILI",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 4,
    name: "Religious Education",
    code: "UP_G4_RE",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 4,
    name: "Agriculture and Nutrition",
    code: "UP_G4_AGR_NUTR",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 4,
    name: "Social Studies",
    code: "UP_G4_SOC_STUDIES",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 4,
    name: "Creative Arts",
    code: "UP_G4_CREATIVE_ARTS",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 4,
    name: "Science and Technology",
    code: "UP_G4_SCI_TECH",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 5,
    name: "English",
    code: "UP_G5_ENGLISH",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 5,
    name: "Mathematics",
    code: "UP_G5_MATH",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 5,
    name: "Kiswahili",
    code: "UP_G5_KISWAHILI",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 5,
    name: "Religious Education",
    code: "UP_G5_RE",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 5,
    name: "Agriculture and Nutrition",
    code: "UP_G5_AGR_NUTR",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 5,
    name: "Social Studies",
    code: "UP_G5_SOC_STUDIES",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 5,
    name: "Creative Arts",
    code: "UP_G5_CREATIVE_ARTS",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 5,
    name: "Science and Technology",
    code: "UP_G5_SCI_TECH",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 6,
    name: "English",
    code: "UP_G6_ENGLISH",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 6,
    name: "Mathematics",
    code: "UP_G6_MATH",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 6,
    name: "Kiswahili",
    code: "UP_G6_KISWAHILI",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 6,
    name: "Religious Education",
    code: "UP_G6_RE",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 6,
    name: "Agriculture and Nutrition",
    code: "UP_G6_AGR_NUTR",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 6,
    name: "Social Studies",
    code: "UP_G6_SOC_STUDIES",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 6,
    name: "Creative Arts",
    code: "UP_G6_CREATIVE_ARTS",
  },
  {
    stage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 6,
    name: "Science and Technology",
    code: "UP_G6_SCI_TECH",
  },
];

async function seedLearningAreas(): Promise<void> {
  for (const seed of learningAreaSeeds) {
    await learningAreaPrisma.learningArea.upsert({
      where: {
        stage_gradeLevel_name: {
          stage: seed.stage,
          gradeLevel: seed.gradeLevel,
          name: seed.name,
        },
      },
      update: {
        code: seed.code,
      },
      create: {
        name: seed.name,
        code: seed.code,
        stage: seed.stage,
        gradeLevel: seed.gradeLevel,
      },
    });
  }
}

type SloSeed = {
  learningAreaStage: EducationStage;
  gradeLevel: number;
  learningAreaName: string;
  strandName: string;
  strandCode?: string;
  subStrandName: string;
  subStrandCode?: string;
  slos: ReadonlyArray<string>;
};

const sloSeeds: ReadonlyArray<SloSeed> = [
  // Pre-Primary: Language Activities
  {
    learningAreaStage: EducationStage.PRE_PRIMARY,
    gradeLevel: 0,
    learningAreaName: "Language Activities",
    strandName: "Listening and Speaking",
    strandCode: "PP_LANG_LISTEN_SPEAK",
    subStrandName: "Listening and responding",
    subStrandCode: "PP_LANG_LISTEN_RESP",
    slos: [
      "Listens attentively to short oral texts and responds appropriately.",
      "Uses simple words and phrases to express basic needs and ideas.",
    ],
  },
  {
    learningAreaStage: EducationStage.PRE_PRIMARY,
    gradeLevel: 0,
    learningAreaName: "Language Activities",
    strandName: "Reading Readiness",
    strandCode: "PP_LANG_READINESS",
    subStrandName: "Print awareness",
    subStrandCode: "PP_LANG_PRINT_AWARE",
    slos: [
      "Identifies familiar environmental print and simple symbols.",
      "Shows interest in books by handling them appropriately.",
    ],
  },
  // Pre-Primary: Mathematics Activities
  {
    learningAreaStage: EducationStage.PRE_PRIMARY,
    gradeLevel: 0,
    learningAreaName: "Mathematics Activities",
    strandName: "Numbers",
    strandCode: "PP_MATH_NUMBERS",
    subStrandName: "Counting objects",
    subStrandCode: "PP_MATH_COUNT_OBJ",
    slos: [
      "Counts concrete objects within a small range and states the total.",
      "Matches number names to quantities in everyday situations.",
    ],
  },
  {
    learningAreaStage: EducationStage.PRE_PRIMARY,
    gradeLevel: 0,
    learningAreaName: "Mathematics Activities",
    strandName: "Patterns and Sorting",
    strandCode: "PP_MATH_PATTERNS",
    subStrandName: "Simple patterns",
    subStrandCode: "PP_MATH_SIMPLE_PATTERNS",
    slos: [
      "Identifies and extends simple repeating patterns using objects.",
    ],
  },
  // Upper Primary: English (example for Grades 4–6 – strands reused across grades)
  {
    learningAreaStage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 4,
    learningAreaName: "English",
    strandName: "Reading Comprehension",
    strandCode: "UP_ENG_READ_COMP",
    subStrandName: "Understanding short texts",
    subStrandCode: "UP_ENG_UNDERSTAND_TEXTS",
    slos: [
      "Reads short passages and answers literal comprehension questions.",
    ],
  },
  {
    learningAreaStage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 5,
    learningAreaName: "English",
    strandName: "Reading Comprehension",
    strandCode: "UP_ENG_READ_COMP",
    subStrandName: "Understanding short texts",
    subStrandCode: "UP_ENG_UNDERSTAND_TEXTS",
    slos: [
      "Identifies main ideas in short informational and narrative texts.",
    ],
  },
  {
    learningAreaStage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 6,
    learningAreaName: "English",
    strandName: "Writing",
    strandCode: "UP_ENG_WRITING",
    subStrandName: "Short guided compositions",
    subStrandCode: "UP_ENG_GUIDED_COMPOSITIONS",
    slos: [
      "Writes short guided paragraphs with appropriate punctuation.",
    ],
  },
  // Upper Primary: Mathematics (example strands for Grades 4–6)
  {
    learningAreaStage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 4,
    learningAreaName: "Mathematics",
    strandName: "Numbers and Operations",
    strandCode: "UP_MATH_NUMBERS",
    subStrandName: "Whole numbers",
    subStrandCode: "UP_MATH_WHOLE_NUMBERS",
    slos: [
      "Performs addition and subtraction of whole numbers within a suitable range.",
    ],
  },
  {
    learningAreaStage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 5,
    learningAreaName: "Mathematics",
    strandName: "Numbers and Operations",
    strandCode: "UP_MATH_NUMBERS",
    subStrandName: "Fractions",
    subStrandCode: "UP_MATH_FRACTIONS",
    slos: [
      "Adds and subtracts simple fractions with like denominators.",
    ],
  },
  {
    learningAreaStage: EducationStage.UPPER_PRIMARY,
    gradeLevel: 6,
    learningAreaName: "Mathematics",
    strandName: "Measurement",
    strandCode: "UP_MATH_MEASUREMENT",
    subStrandName: "Length and perimeter",
    subStrandCode: "UP_MATH_LENGTH_PERIM",
    slos: [
      "Determines the perimeter of simple plane figures using appropriate units.",
    ],
  },
];

async function seedStrandsAndSlos(): Promise<void> {
  for (const seed of sloSeeds) {
    const learningArea = await learningAreaPrisma.learningArea.findFirst({
      where: {
        stage: seed.learningAreaStage,
        gradeLevel: seed.gradeLevel,
        name: seed.learningAreaName,
      },
    });

    if (!learningArea) {
      // Learning area not present (e.g. not seeded for this grade/stage); skip.
      continue;
    }

    const existingStrand = await curriculumPrisma.strand.findFirst({
      where: {
        learningAreaId: learningArea.id,
        name: seed.strandName,
      },
    });

    const strand =
      existingStrand ||
      (await curriculumPrisma.strand.create({
        data: {
          learningAreaId: learningArea.id,
          name: seed.strandName,
          ...(seed.strandCode !== undefined ? { code: seed.strandCode } : {}),
        },
      }));

    const existingSubStrand = await curriculumPrisma.subStrand.findFirst({
      where: {
        strandId: strand.id,
        name: seed.subStrandName,
      },
    });

    const subStrand =
      existingSubStrand ||
      (await curriculumPrisma.subStrand.create({
        data: {
          strandId: strand.id,
          name: seed.subStrandName,
          ...(seed.subStrandCode !== undefined ? { code: seed.subStrandCode } : {}),
        },
      }));

    for (const description of seed.slos) {
      await curriculumPrisma.specificLearningOutcome.create({
        data: {
          subStrandId: subStrand.id,
          description,
          // code is optional; can be filled with official SLO codes later.
        },
      });
    }
  }
}

async function main(): Promise<void> {
  await seedLearningAreas();
  await seedStrandsAndSlos();
}

main()
  .catch(async (error: unknown) => {
    console.error("❌ Error while seeding CBC curriculum:", error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .then(async () => {
    await prisma.$disconnect();
  });
