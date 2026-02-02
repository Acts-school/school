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

type MobileSasaSingleSmsResponse = {
  status?: boolean;
  responseCode?: string;
  message?: string;
  messageId?: string;
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
  const apiToken = getEnv("MOBILESASA_API_TOKEN");
  const senderId = getEnv("MOBILESASA_SENDER_ID");

  // If SMS provider is not configured, mark as SENT in the log without making any external call
  if (!apiToken || !senderId) {
    await smsPrisma.smsNotification.update({
      where: { id: smsId },
      data: {
        status: "SENT",
        provider: "mobilesasa-stub",
        sentAt: new Date(),
      },
    });
    return;
  }

  try {
    const response = await fetch("https://api.mobilesasa.com/v1/send/message", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        senderID: senderId,
        message: body,
        phone: toPhone,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await smsPrisma.smsNotification.update({
        where: { id: smsId },
        data: {
          status: "FAILED",
          provider: "mobilesasa",
          errorMessage: errorText.slice(0, 1000),
        },
      });
      return;
    }

    const raw = (await response.json()) as MobileSasaSingleSmsResponse;

    const isSuccess = raw.status === true && raw.responseCode === "0200";
    const localStatus: SmsDeliveryStatus = isSuccess ? "SENT" : "FAILED";

    let logicalErrorMessage: string | null = null;
    if (!isSuccess) {
      const parts: string[] = [];
      if (typeof raw.message === "string" && raw.message.length > 0) {
        parts.push(raw.message);
      }
      if (typeof raw.responseCode === "string" && raw.responseCode.length > 0) {
        parts.push(`Code: ${raw.responseCode}`);
      }
      const combined = parts.join(" | ");
      logicalErrorMessage = combined.length > 0 ? combined.slice(0, 1000) : null;
    }

    await smsPrisma.smsNotification.update({
      where: { id: smsId },
      data: {
        status: localStatus,
        provider: "mobilesasa",
        externalId: raw.messageId ?? null,
        errorMessage: logicalErrorMessage,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown MobileSasa error";
    await smsPrisma.smsNotification.update({
      where: { id: smsId },
      data: {
        status: "FAILED",
        provider: "mobilesasa",
        errorMessage: message.slice(0, 1000),
      },
    });
  }
};
