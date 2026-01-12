-- CreateEnum
CREATE TYPE "MpesaReviewReason" AS ENUM ('NO_STUDENT', 'MULTIPLE_STUDENTS', 'NO_FEES', 'OTHER');

-- AlterTable
ALTER TABLE "MpesaTransaction" ADD COLUMN     "reviewReason" "MpesaReviewReason";
