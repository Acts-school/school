-- CreateEnum
CREATE TYPE "MpesaTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'MPESA';

-- CreateTable
CREATE TABLE "MpesaTransaction" (
    "id" SERIAL NOT NULL,
    "studentFeeId" TEXT,
    "paymentId" INTEGER,
    "phoneNumber" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "MpesaTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "checkoutRequestId" TEXT,
    "merchantRequestId" TEXT,
    "mpesaReceiptNumber" TEXT,
    "rawCallback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MpesaTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MpesaTransaction_paymentId_key" ON "MpesaTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_checkoutRequestId_idx" ON "MpesaTransaction"("checkoutRequestId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_mpesaReceiptNumber_idx" ON "MpesaTransaction"("mpesaReceiptNumber");

-- AddForeignKey
ALTER TABLE "MpesaTransaction" ADD CONSTRAINT "MpesaTransaction_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MpesaTransaction" ADD CONSTRAINT "MpesaTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
