-- CreateTable
CREATE TABLE "LearningArea" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "stage" "EducationStage" NOT NULL,
    "gradeLevel" INTEGER NOT NULL,

    CONSTRAINT "LearningArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strand" (
    "id" SERIAL NOT NULL,
    "learningAreaId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "Strand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubStrand" (
    "id" SERIAL NOT NULL,
    "strandId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "SubStrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecificLearningOutcome" (
    "id" SERIAL NOT NULL,
    "subStrandId" INTEGER NOT NULL,
    "code" TEXT,
    "description" TEXT NOT NULL,

    CONSTRAINT "SpecificLearningOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningArea_code_key" ON "LearningArea"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LearningArea_stage_gradeLevel_name_key" ON "LearningArea"("stage", "gradeLevel", "name");

-- AddForeignKey
ALTER TABLE "Strand" ADD CONSTRAINT "Strand_learningAreaId_fkey" FOREIGN KEY ("learningAreaId") REFERENCES "LearningArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubStrand" ADD CONSTRAINT "SubStrand_strandId_fkey" FOREIGN KEY ("strandId") REFERENCES "Strand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificLearningOutcome" ADD CONSTRAINT "SpecificLearningOutcome_subStrandId_fkey" FOREIGN KEY ("subStrandId") REFERENCES "SubStrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
