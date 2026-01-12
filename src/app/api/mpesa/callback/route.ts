import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { applyStudentFeePayment } from "@/lib/studentFeePayments";

const mpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number().int(),
      ResultDesc: z.string(),
      CallbackMetadata: z
        .object({
          Item: z.array(
            z.object({
              Name: z.string(),
              Value: z.union([z.string(), z.number()]).optional(),
            }),
          ),
        })
        .optional(),
    }),
  }),
});

export type MpesaCallbackBody = z.infer<typeof mpesaCallbackSchema>;

export async function POST(req: NextRequest): Promise<NextResponse<{ ok: boolean }>> {
  try {
    const json = (await req.json()) as unknown;
    const parsed = mpesaCallbackSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const stk = parsed.data.Body.stkCallback;

    const checkoutRequestId = stk.CheckoutRequestID;
    const resultCode = stk.ResultCode;
    const resultDesc = stk.ResultDesc;

    const items = stk.CallbackMetadata?.Item ?? [];
    const findItem = (name: string) => items.find((i) => i.Name === name);

    const receiptItem = findItem("MpesaReceiptNumber");
    const mpesaReceiptNumber =
      typeof receiptItem?.Value === "string" ? receiptItem.Value : undefined;

    const transaction = await prisma.mpesaTransaction.findFirst({
      where: { checkoutRequestId },
    });

    if (!transaction || !transaction.studentFeeId) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    if (resultCode !== 0) {
      await prisma.mpesaTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          rawCallback: json as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json({ ok: true });
    }

    const { payment } = await applyStudentFeePayment({
      studentFeeId: transaction.studentFeeId,
      amountMinor: transaction.amount,
      method: "MPESA",
      reference: mpesaReceiptNumber ?? null,
    });

    await prisma.mpesaTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "SUCCESS",
        paymentId: payment.id,
        mpesaReceiptNumber: mpesaReceiptNumber ?? transaction.mpesaReceiptNumber,
        rawCallback: json as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error handling M-Pesa callback:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
