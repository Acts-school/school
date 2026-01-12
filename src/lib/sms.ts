"use server";

import prisma from "./prisma";

export type SmsNotificationKind = "ANNOUNCEMENT" | "EVENT" | "FEE_REMINDER";

export interface SmsContext {
  kind: SmsNotificationKind;
  relatedId: string;
}

export interface SendSmsInput {
  toPhone: string;
  body: string;
  context: SmsContext;
}

type SmsDeliveryStatus = "PENDING" | "SENT" | "FAILED";

type SmsNotificationCreateArgs = {
  data: {
    toPhone: string;
    body: string;
    status: SmsDeliveryStatus;
    provider?: string | null;
    externalId?: string | null;
    errorMessage?: string | null;
    kind: SmsNotificationKind;
    relatedId: string;
    createdAt?: Date;
    sentAt?: Date | null;
  };
};

type SmsNotificationUpdateArgs = {
  where: { id: number };
  data: {
    status?: SmsDeliveryStatus;
    provider?: string | null;
    externalId?: string | null;
    errorMessage?: string | null;
    sentAt?: Date | null;
  };
};

type SmsPrismaClient = {
  smsNotification: {
    create: (args: SmsNotificationCreateArgs) => Promise<{ id: number }>;
    update: (args: SmsNotificationUpdateArgs) => Promise<unknown>;
  };
};

const smsPrisma = prisma as unknown as SmsPrismaClient;

const getEnv = (key: string): string | null => {
  const value = process.env[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const mapAfricasTalkingStatusToLocal = (
  status: string | null | undefined,
  statusCode: number | null | undefined,
): SmsDeliveryStatus => {
  if (statusCode === 101) {
    // Africa's Talking 101: Success
    return "SENT";
  }

  if (!status) return "SENT";

  const lower = status.toLowerCase();
  if (lower === "success" || lower === "sent") {
    return "SENT";
  }

  return "FAILED";
};

export const sendSms = async (input: SendSmsInput): Promise<void> => {
  const { toPhone, body, context } = input;

  const created = await smsPrisma.smsNotification.create({
    data: {
      toPhone,
      body,
      status: "PENDING",
      provider: null,
      externalId: null,
      errorMessage: null,
      kind: context.kind,
      relatedId: context.relatedId,
      createdAt: new Date(),
      sentAt: null,
    },
  });

  const smsId = created.id;

  const username = getEnv("AFRICASTALKING_USERNAME");
  const apiKey = getEnv("AFRICASTALKING_API_KEY");
  const fromShortCode = getEnv("AFRICASTALKING_FROM");

  // If Africa's Talking is not configured, mark as SENT in the log without making any external call
  if (!username || !apiKey) {
    await smsPrisma.smsNotification.update({
      where: { id: smsId },
      data: {
        status: "SENT",
        provider: "africastalking-stub",
        sentAt: new Date(),
      },
    });
    return;
  }

  try {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("to", toPhone);
    params.append("message", body);
    if (fromShortCode) {
      params.append("from", fromShortCode);
    }

    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await smsPrisma.smsNotification.update({
        where: { id: smsId },
        data: {
          status: "FAILED",
          provider: "africastalking",
          errorMessage: errorText.slice(0, 1000),
        },
      });
      return;
    }

    type AfricasTalkingRecipient = {
      status?: string;
      statusCode?: number;
      number?: string;
      messageId?: string;
      cost?: string;
    };

    type AfricasTalkingResponse = {
      SMSMessageData?: {
        Message?: string;
        Recipients?: AfricasTalkingRecipient[];
      };
    };

    const raw = (await response.json()) as AfricasTalkingResponse;
    const recipient = raw.SMSMessageData?.Recipients?.[0] ?? null;
    const localStatus = mapAfricasTalkingStatusToLocal(
      recipient?.status ?? null,
      typeof recipient?.statusCode === "number" ? recipient.statusCode : null,
    );
    const messageId = recipient?.messageId ?? null;

    let logicalErrorMessage: string | null = null;
    if (localStatus === "FAILED") {
      const parts: string[] = [];
      const topMessage = raw.SMSMessageData?.Message;
      if (typeof topMessage === "string" && topMessage.length > 0) {
        parts.push(topMessage);
      }
      const recipientStatus = recipient?.status;
      if (typeof recipientStatus === "string" && recipientStatus.length > 0) {
        parts.push(`Status: ${recipientStatus}`);
      }
      const recipientStatusCode = recipient?.statusCode;
      if (typeof recipientStatusCode === "number") {
        parts.push(`Code: ${recipientStatusCode}`);
      }

      const combined = parts.join(" | ");
      logicalErrorMessage = combined.length > 0 ? combined.slice(0, 1000) : null;
    }

    await smsPrisma.smsNotification.update({
      where: { id: smsId },
      data: {
        status: localStatus,
        provider: "africastalking",
        externalId: messageId,
        errorMessage: logicalErrorMessage,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Africa's Talking error";
    await smsPrisma.smsNotification.update({
      where: { id: smsId },
      data: {
        status: "FAILED",
        provider: "africastalking",
        errorMessage: message.slice(0, 1000),
      },
    });
  }
};
