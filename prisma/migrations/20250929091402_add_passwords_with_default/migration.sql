-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "password" TEXT NOT NULL DEFAULT '$2a$10$defaultpasswordhash123456';

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "password" TEXT NOT NULL DEFAULT '$2a$10$defaultpasswordhash123456';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "password" TEXT NOT NULL DEFAULT '$2a$10$defaultpasswordhash123456';

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "password" TEXT NOT NULL DEFAULT '$2a$10$defaultpasswordhash123456';
