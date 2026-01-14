-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'LEFT', 'ALUMNI');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE';
