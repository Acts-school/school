import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

const mpesaInitiateSchema = z.object({
  studentFeeId: z.string().min(1),
  amount: z.number().positive(),
  phoneNumber: z.string().min(1),
});

type MpesaInitiateBody = z.infer<typeof mpesaInitiateSchema>;

type MpesaTransactionStatusLiteral = "PENDING" | "SUCCESS" | "FAILED";

type MpesaInitiateSuccess = {
  id: number;
  status: MpesaTransactionStatusLiteral;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
};

type MpesaInitiateError = { error: string };

type MpesaInitiateResponse = MpesaInitiateSuccess | MpesaInitiateError;

export async function POST(req: NextRequest): Promise<NextResponse<MpesaInitiateResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    const userId = session.user.id;

    if (role !== "admin" && role !== "accountant" && role !== "parent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const json = (await req.json()) as unknown;
    const parsed = mpesaInitiateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { studentFeeId, amount, phoneNumber } = parsed.data as MpesaInitiateBody;

    const fee = await prisma.studentFee.findUnique({
      where: { id: studentFeeId },
      select: {
        id: true,
        amountDue: true,
        amountPaid: true,
        student: {
          select: {
            parentId: true,
          },
        },
      },
    });

    if (!fee) {
      return NextResponse.json({ error: "Student fee not found" }, { status: 404 });
    }

    if (role === "parent" && fee.student.parentId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const amountMinor = Math.round(amount * 100);

    const stkResult = await initiateMpesaStkPush({
      amount,
      phoneNumber,
      studentFeeId,
    });

    const transaction = await prisma.mpesaTransaction.create({
      data: {
        studentFeeId,
        phoneNumber,
        amount: amountMinor,
        checkoutRequestId: stkResult.checkoutRequestId,
        merchantRequestId: stkResult.merchantRequestId,
      },
    });

    const body: MpesaInitiateSuccess = {
      id: transaction.id,
      status: transaction.status as MpesaTransactionStatusLiteral,
      checkoutRequestId: transaction.checkoutRequestId ?? null,
      merchantRequestId: transaction.merchantRequestId ?? null,
    };

    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("Error initiating M-Pesa payment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

type InitiateMpesaStkPushInput = {
  amount: number;
  phoneNumber: string;
  studentFeeId: string;
};

type InitiateMpesaStkPushResult = {
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
};

const oauthResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.union([z.string(), z.number()]),
});

const stkPushResponseSchema = z.object({
  MerchantRequestID: z.string(),
  CheckoutRequestID: z.string(),
  ResponseCode: z.string(),
  ResponseDescription: z.string(),
  CustomerMessage: z.string(),
});

const buildTimestamp = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const getMpesaBaseUrl = (): string => {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
};

const getMpesaAccessToken = async (): Promise<string> => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("M-Pesa credentials are not configured");
  }

  const baseUrl = getMpesaBaseUrl();
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to obtain M-Pesa access token (status ${response.status})`);
  }

  const data = (await response.json()) as unknown;
  const parsed = oauthResponseSchema.parse(data);
  return parsed.access_token;
};

async function initiateMpesaStkPush(input: InitiateMpesaStkPushInput): Promise<InitiateMpesaStkPushResult> {
  const shortCode = process.env.MPESA_SHORTCODE;
  const passKey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!shortCode || !passKey || !callbackUrl) {
    throw new Error("M-Pesa STK configuration is incomplete");
  }

  const baseUrl = getMpesaBaseUrl();
  const timestamp = buildTimestamp();
  const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString("base64");
  const accessToken = await getMpesaAccessToken();

  const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(input.amount),
      PartyA: input.phoneNumber,
      PartyB: shortCode,
      PhoneNumber: input.phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: input.studentFeeId,
      TransactionDesc: "School fee payment",
    }),
  });

  if (!response.ok) {
    throw new Error(`M-Pesa STK push HTTP error (status ${response.status})`);
  }

  const data = (await response.json()) as unknown;
  const parsed = stkPushResponseSchema.parse(data);

  if (parsed.ResponseCode !== "0") {
    throw new Error(`M-Pesa STK push rejected: ${parsed.ResponseDescription}`);
  }

  return {
    checkoutRequestId: parsed.CheckoutRequestID,
    merchantRequestId: parsed.MerchantRequestID,
  };
}
