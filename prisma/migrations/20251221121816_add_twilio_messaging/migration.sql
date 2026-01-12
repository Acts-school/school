-- CreateEnum
CREATE TYPE "SmsNotificationKind" AS ENUM ('ANNOUNCEMENT', 'EVENT', 'FEE_REMINDER');

-- CreateTable
CREATE TABLE "SmsNotification" (
    "id" SERIAL NOT NULL,
    "toPhone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SmsDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "externalId" TEXT,
    "errorMessage" TEXT,
    "kind" "SmsNotificationKind" NOT NULL,
    "relatedId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "SmsNotification_pkey" PRIMARY KEY ("id")
);
