-- AlterTable
ALTER TABLE "Admin" ALTER COLUMN "password" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Parent" ALTER COLUMN "password" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "password" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Teacher" ALTER COLUMN "password" DROP DEFAULT;
