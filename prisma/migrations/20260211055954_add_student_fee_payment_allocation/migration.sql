-- CreateTable
CREATE TABLE "StudentFeePaymentAllocation" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "studentFeeId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentFeePaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentFeePaymentAllocation_paymentId_idx" ON "StudentFeePaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "StudentFeePaymentAllocation_studentFeeId_idx" ON "StudentFeePaymentAllocation"("studentFeeId");

-- AddForeignKey
ALTER TABLE "StudentFeePaymentAllocation" ADD CONSTRAINT "StudentFeePaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeePaymentAllocation" ADD CONSTRAINT "StudentFeePaymentAllocation_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
