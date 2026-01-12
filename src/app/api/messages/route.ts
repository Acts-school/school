import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensurePermission, getAuthContext, getCurrentSchoolContext } from "@/lib/authz";

// Narrowed Prisma facade for messaging models

type MessageSummaryRow = {
  id: number;
  body: string;
  senderUserId: string;
  createdAt: Date;
  channel: "IN_APP" | "SMS";
  smsStatus: "PENDING" | "SENT" | "FAILED" | null;
};

type InboxThreadRow = {
  id: number;
  subject: string | null;
  updatedAt: Date;
  participants: { userId: string; lastReadAt: Date | null; isDeleted: boolean }[];
  messages: MessageSummaryRow[];
};

type ThreadWithMessagesRow = {
  id: number;
  subject: string | null;
  participants: { userId: string; isDeleted: boolean }[];
  messages: MessageSummaryRow[];
};

type MessageThreadFindManyArgs = {
  where: {
    participants: {
      some: {
        userId: string;
        isDeleted?: boolean;
      };
    };
  };
  include: {
    participants: { select: { userId: true; lastReadAt: true; isDeleted: true } };
    messages: {
      select: { id: true; body: true; createdAt: true; senderUserId: true; channel: true; smsStatus: true };
      orderBy: { createdAt: "desc" };
      take: number;
    };
  };
  orderBy: { updatedAt: "desc" };
};

type MessageThreadFindUniqueArgs = {
  where: { id: number };
  select: {
    id: true;
    subject: true;
    participants: { select: { userId: true; isDeleted: true } };
    messages: {
      select: { id: true; body: true; createdAt: true; senderUserId: true; channel: true; smsStatus: true };
      orderBy: { createdAt: "asc" };
    };
  };
};

type MessageThreadCreateArgs = {
  data: {
    subject?: string | null;
    schoolId?: number | null;
  };
};

type MessageParticipantCreateArgs = {
  data: {
    threadId: number;
    userId: string;
  };
};

type MessageCreateArgs = {
  data: {
    threadId: number;
    senderUserId: string;
    body: string;
    channel: "IN_APP" | "SMS";
    smsProvider?: string | null;
    smsStatus?: "PENDING" | "SENT" | "FAILED" | null;
    recipientPhone?: string | null;
    externalId?: string | null;
  };
};

type MessageThreadUpdateArgs = {
  where: { id: number };
  data: { updatedAt: Date };
};

type MessageParticipantUpdateManyArgs = {
  where: { threadId: number; userId: string; isDeleted: boolean };
  data: { lastReadAt: Date };
};

type MessageCountArgs = {
  where: {
    threadId: number;
    senderUserId: { not: string };
    createdAt?: { gt: Date };
  };
};

type MessagesPrismaClient = {
  messageThread: {
    findMany: (args: MessageThreadFindManyArgs) => Promise<InboxThreadRow[]>;
    findUnique: (args: MessageThreadFindUniqueArgs) => Promise<ThreadWithMessagesRow | null>;
    create: (args: MessageThreadCreateArgs) => Promise<{ id: number }>;
    update: (args: MessageThreadUpdateArgs) => Promise<unknown>;
  };
  messageParticipant: {
    create: (args: MessageParticipantCreateArgs) => Promise<unknown>;
    updateMany: (args: MessageParticipantUpdateManyArgs) => Promise<unknown>;
  };
  message: {
    create: (args: MessageCreateArgs) => Promise<unknown>;
    count: (args: MessageCountArgs) => Promise<number>;
  };
  $transaction: <T>(ops: ReadonlyArray<Promise<T>>) => Promise<T[]>;
};

const messagesPrisma = prisma as unknown as MessagesPrismaClient;

type UserNameRow = { id: string; username: string };
type NamedUserRow = { id: string; username: string; name: string; surname: string };

type StudentLookupArgs = {
  where: { id: { in: string[] } };
  select: { id: true; username: true; name: true; surname: true };
};

type TeacherLookupArgs = StudentLookupArgs;
type ParentLookupArgs = StudentLookupArgs;

type AdminLookupArgs = {
  where: { id: { in: string[] } };
  select: { id: true; username: true };
};

type AccountantLookupArgs = AdminLookupArgs;

type UserLookupPrisma = {
  student: { findMany: (args: StudentLookupArgs) => Promise<NamedUserRow[]> };
  teacher: { findMany: (args: TeacherLookupArgs) => Promise<NamedUserRow[]> };
  parent: { findMany: (args: ParentLookupArgs) => Promise<NamedUserRow[]> };
  admin: { findMany: (args: AdminLookupArgs) => Promise<UserNameRow[]> };
  accountant: { findMany: (args: AccountantLookupArgs) => Promise<UserNameRow[]> };
};

const userLookupPrisma = prisma as unknown as UserLookupPrisma;

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  try {
    await ensurePermission("messages.read");
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const threadIdParam = searchParams.get("threadId");

    if (threadIdParam) {
      const threadId = Number.parseInt(threadIdParam, 10);
      if (!Number.isFinite(threadId)) {
        return NextResponse.json({ error: "Invalid threadId" }, { status: 400 });
      }

      const thread = await messagesPrisma.messageThread.findUnique({
        where: { id: threadId },
        select: {
          id: true,
          subject: true,
          participants: { select: { userId: true, isDeleted: true } },
          messages: {
            select: { id: true, body: true, createdAt: true, senderUserId: true },
            orderBy: { createdAt: "asc" },
          },
        },
      } as MessageThreadFindUniqueArgs);

      if (!thread) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }

      const isParticipant = thread.participants.some(
        (p) => p.userId === auth.userId && !p.isDeleted,
      );
      if (!isParticipant) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Mark messages as read for this user when they open the thread
      const latestCreatedAt =
        thread.messages.length > 0
          ? thread.messages[thread.messages.length - 1]?.createdAt ?? new Date()
          : new Date();

      await messagesPrisma.messageParticipant.updateMany({
        where: { threadId, userId: auth.userId, isDeleted: false },
        data: { lastReadAt: latestCreatedAt },
      } as MessageParticipantUpdateManyArgs);

      return NextResponse.json({
        threadId: thread.id,
        subject: thread.subject,
        messages: thread.messages,
      });
    }

    const threads = await messagesPrisma.messageThread.findMany({
      where: {
        participants: {
          some: {
            userId: auth.userId,
            isDeleted: false,
          },
        },
      },
      include: {
        participants: {
          select: { userId: true },
        },
        messages: {
          select: { id: true, body: true, createdAt: true, senderUserId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    } as MessageThreadFindManyArgs);
    const otherUserIdSet = new Set<string>();
    for (const thread of threads) {
      const other =
        thread.participants.find((p) => p.userId !== auth.userId) ?? thread.participants[0];
      if (other) {
        otherUserIdSet.add(other.userId);
      }
    }

    const otherUserIds = Array.from(otherUserIdSet);

    const [students, teachers, parents, admins, accountants] = otherUserIds.length
      ? await Promise.all([
          userLookupPrisma.student.findMany({
            where: { id: { in: otherUserIds } },
            select: { id: true, username: true, name: true, surname: true },
          } as StudentLookupArgs),
          userLookupPrisma.teacher.findMany({
            where: { id: { in: otherUserIds } },
            select: { id: true, username: true, name: true, surname: true },
          } as TeacherLookupArgs),
          userLookupPrisma.parent.findMany({
            where: { id: { in: otherUserIds } },
            select: { id: true, username: true, name: true, surname: true },
          } as ParentLookupArgs),
          userLookupPrisma.admin.findMany({
            where: { id: { in: otherUserIds } },
            select: { id: true, username: true },
          } as AdminLookupArgs),
          userLookupPrisma.accountant.findMany({
            where: { id: { in: otherUserIds } },
            select: { id: true, username: true },
          } as AccountantLookupArgs),
        ])
      : [[], [], [], [], []];

    const displayMap = new Map<string, { name: string; username: string }>();

    const addNamed = (rows: NamedUserRow[]) => {
      for (const r of rows) {
        const fullName = `${r.name} ${r.surname}`.trim();
        displayMap.set(r.id, { name: fullName, username: r.username });
      }
    };

    addNamed(students);
    addNamed(teachers);
    addNamed(parents);

    const addSimple = (rows: UserNameRow[]) => {
      for (const r of rows) {
        displayMap.set(r.id, { name: r.username, username: r.username });
      }
    };

    addSimple(admins);
    addSimple(accountants);

    // Compute unread counts per thread for the current user
    const unreadEntries = await Promise.all(
      threads.map(async (thread) => {
        const me = thread.participants.find((p) => p.userId === auth.userId) ?? null;
        const where: MessageCountArgs["where"] = {
          threadId: thread.id,
          senderUserId: { not: auth.userId },
          ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
        };
        const count = await messagesPrisma.message.count({ where } as MessageCountArgs);
        return [thread.id, count] as const;
      }),
    );

    const unreadMap = new Map<number, number>(unreadEntries);

    const response = threads.map((thread) => {
      const other =
        thread.participants.find((p) => p.userId !== auth.userId) ?? thread.participants[0] ?? null;
      const display = other ? displayMap.get(other.userId) ?? null : null;

      return {
        id: thread.id,
        subject: thread.subject,
        updatedAt: thread.updatedAt,
        participants: thread.participants,
        lastMessage: thread.messages[0] ?? null,
        displayName: display?.name ?? null,
        displayUsername: display?.username ?? null,
        unreadCount: unreadMap.get(thread.id) ?? 0,
      };
    });

    return NextResponse.json({ threads: response });
  } catch (error) {
    console.error("Error in GET /api/messages", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

interface SendMessageBody {
  threadId?: number;
  recipientUserId?: string;
  body: string;
}

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  try {
    await ensurePermission("messages.send");
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = (await req.json()) as unknown;

    if (
      typeof json !== "object" ||
      json === null ||
      ("body" in json ? typeof (json as { body: unknown }).body !== "string" : true)
    ) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const bodyTyped = json as SendMessageBody;
    const { body, threadId, recipientUserId } = bodyTyped;

    if (!body.trim()) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    if (threadId !== undefined && recipientUserId !== undefined) {
      return NextResponse.json(
        { error: "Provide either threadId or recipientUserId, not both" },
        { status: 400 },
      );
    }

    const ops: Promise<unknown>[] = [];
    let targetThreadId: number | null = null;

    if (typeof threadId === "number") {
      const existing = await messagesPrisma.messageThread.findUnique({
        where: { id: threadId },
        select: {
          id: true,
          participants: { select: { userId: true, isDeleted: true } },
        },
      } as MessageThreadFindUniqueArgs);

      if (!existing) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }

      const isParticipant = existing.participants.some(
        (p) => p.userId === auth.userId && !p.isDeleted,
      );
      if (!isParticipant) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      targetThreadId = existing.id;
    } else {
      if (!recipientUserId || typeof recipientUserId !== "string") {
        return NextResponse.json(
          { error: "recipientUserId is required when threadId is not provided" },
          { status: 400 },
        );
      }

      if (recipientUserId === auth.userId) {
        return NextResponse.json(
          { error: "Cannot start a conversation with yourself" },
          { status: 400 },
        );
      }

      const { schoolId } = await getCurrentSchoolContext();

      const createdThreadPromise = messagesPrisma.messageThread.create({
        data: {
          subject: null,
          ...(schoolId !== null ? { schoolId } : {}),
        },
      } as MessageThreadCreateArgs);

      const [createdThread] = (await messagesPrisma.$transaction([createdThreadPromise])) as [
        { id: number },
      ];

      targetThreadId = createdThread.id;

      const participantOps: Promise<unknown>[] = [
        messagesPrisma.messageParticipant.create({
          data: { threadId: targetThreadId, userId: auth.userId },
        } as MessageParticipantCreateArgs),
        messagesPrisma.messageParticipant.create({
          data: { threadId: targetThreadId, userId: recipientUserId },
        } as MessageParticipantCreateArgs),
      ];

      await messagesPrisma.$transaction(participantOps);
    }

    if (targetThreadId === null) {
      return NextResponse.json({ error: "Unable to determine target thread" }, { status: 500 });
    }

    ops.push(
      messagesPrisma.message.create({
        data: {
          threadId: targetThreadId,
          senderUserId: auth.userId,
          body,
          channel: "IN_APP",
        },
      } as MessageCreateArgs),
    );

    ops.push(
      messagesPrisma.messageThread.update({
        where: { id: targetThreadId },
        data: { updatedAt: new Date() },
      } as MessageThreadUpdateArgs),
    );

    await messagesPrisma.$transaction(ops);

    return NextResponse.json({ success: true, threadId: targetThreadId });
  } catch (error) {
    console.error("Error in POST /api/messages", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
