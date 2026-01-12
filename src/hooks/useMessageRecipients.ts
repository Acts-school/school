import { useQuery } from "@tanstack/react-query";

export type RecipientKind = "student" | "teacher" | "parent" | "admin" | "accountant";

export interface MessageRecipient {
  userId: string;
  kind: RecipientKind;
  name: string;
  username: string;
}

interface RecipientsResponse {
  recipients: MessageRecipient[];
}

const fetchRecipients = async (q: string): Promise<RecipientsResponse> => {
  const trimmed = q.trim();
  if (trimmed.length < 2) {
    return { recipients: [] };
  }

  const params = new URLSearchParams({ q: trimmed });
  const res = await fetch(`/api/messages/recipients?${params.toString()}`);

  if (!res.ok) {
    throw new Error("Failed to fetch recipients");
  }

  return (await res.json()) as RecipientsResponse;
};

export const useMessageRecipients = (q: string) => {
  const trimmed = q.trim();

  return useQuery({
    queryKey: ["messages", "recipients", trimmed],
    queryFn: () => fetchRecipients(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
};
