-- CreateTable
CREATE TABLE "StudentPhoneAlias" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentPhoneAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentPhoneAlias_phone_idx" ON "StudentPhoneAlias"("phone");

-- CreateIndex
CREATE INDEX "StudentPhoneAlias_studentId_idx" ON "StudentPhoneAlias"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPhoneAlias_studentId_phone_key" ON "StudentPhoneAlias"("studentId", "phone");

-- AddForeignKey
ALTER TABLE "StudentPhoneAlias" ADD CONSTRAINT "StudentPhoneAlias_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
