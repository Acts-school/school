import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

export interface MessageSummary {
  id: number;
  body: string;
  senderUserId: string;
  createdAt: string;
  channel: "IN_APP" | "SMS";
  smsStatus: "PENDING" | "SENT" | "FAILED" | null;
}

export interface InboxThread {
  id: number;
  subject: string | null;
  updatedAt: string;
  participants: { userId: string }[];
  lastMessage: MessageSummary | null;
  displayName?: string | null;
  displayUsername?: string | null;
  unreadCount?: number;
}

interface InboxResponse {
  threads: InboxThread[];
}

interface ThreadMessagesResponse {
  threadId: number;
  subject: string | null;
  messages: MessageSummary[];
}

export interface SendMessageInput {
  body: string;
  threadId?: number;
  recipientUserId?: string;
}

const fetchInbox = async (): Promise<InboxResponse> => {
  const res = await fetch("/api/messages");
  if (!res.ok) {
    throw new Error("Failed to fetch inbox");
  }
  return res.json() as Promise<InboxResponse>;
};

const fetchThreadMessages = async (threadId: number): Promise<ThreadMessagesResponse> => {
  const params = new URLSearchParams({ threadId: threadId.toString() });
  const res = await fetch(`/api/messages?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch messages");
  }
  return res.json() as Promise<ThreadMessagesResponse>;
};

const sendMessage = async (input: SendMessageInput): Promise<{ success: boolean; threadId: number }> => {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as { error?: string } | null;
    const message = errorBody?.error ?? "Failed to send message";
    throw new Error(message);
  }

  return res.json() as Promise<{ success: boolean; threadId: number }>;
};

export const useInbox = () => {
  return useQuery({
    queryKey: ["messages", "inbox"],
    queryFn: fetchInbox,
    staleTime: 60_000,
  });
};

export const useThreadMessages = (threadId: number | null) => {
  return useQuery({
    queryKey: ["messages", "thread", threadId],
    queryFn: () => {
      if (threadId === null) {
        return Promise.resolve({ threadId: 0, subject: null, messages: [] });
      }
      return fetchThreadMessages(threadId);
    },
    enabled: threadId !== null,
    staleTime: 30_000,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["messages", "inbox"] });
      void queryClient.invalidateQueries({ queryKey: ["messages", "thread", data.threadId] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to send message";
      toast.error(message);
    },
  });
};
