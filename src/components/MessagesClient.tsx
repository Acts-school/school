"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useInbox, useSendMessage, useThreadMessages, type MessageSummary } from "@/hooks/useMessages";
import { useMessageRecipients, type MessageRecipient } from "@/hooks/useMessageRecipients";

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleString();
};

const MessagesClient = () => {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const searchParams = useSearchParams();

  const canSend = role === "admin" || role === "teacher";

  const { data: inbox, isLoading: inboxLoading, error: inboxError } = useInbox();
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<MessageRecipient | null>(null);
  const [composeBody, setComposeBody] = useState("");

  const {
    data: recipientsData,
    isLoading: recipientsLoading,
    error: recipientsError,
  } = useMessageRecipients(recipientSearch);

  const {
    data: thread,
    isLoading: threadLoading,
    error: threadError,
  } = useThreadMessages(selectedThreadId);

  const sendMessageMutation = useSendMessage();

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    const idParam = searchParams.get("recipientId");
    const kindParam = searchParams.get("recipientKind");
    const nameParam = searchParams.get("recipientName");

    if (!idParam || !kindParam) {
      return;
    }

    const isValidKind =
      kindParam === "student" ||
      kindParam === "teacher" ||
      kindParam === "parent" ||
      kindParam === "admin" ||
      kindParam === "accountant";

    if (!isValidKind) {
      return;
    }

    if (isNewConversation || selectedRecipient) {
      return;
    }

    const safeKind = kindParam as MessageRecipient["kind"];
    const displayName = nameParam && nameParam.length > 0 ? nameParam : idParam;

    setIsNewConversation(true);
    setSelectedThreadId(null);
    setSelectedRecipient({
      userId: idParam,
      kind: safeKind,
      name: displayName,
      username: displayName,
    });
    setRecipientSearch(displayName);
  }, [isNewConversation, searchParams, selectedRecipient, selectedThreadId]);

  useEffect(() => {
    if (!inbox || inbox.threads.length === 0) {
      setSelectedThreadId(null);
      return;
    }
    if (selectedThreadId === null && !isNewConversation) {
      setSelectedThreadId(inbox.threads[0]?.id ?? null);
    }
  }, [inbox, selectedThreadId, isNewConversation]);

  const handleSelectThread = (threadId: number) => {
    setIsNewConversation(false);
    setSelectedThreadId(threadId);
    setComposeBody("");
  };

  const handleStartNew = () => {
    if (!canSend) return;
    setIsNewConversation(true);
    setSelectedThreadId(null);
    setRecipientSearch("");
    setSelectedRecipient(null);
    setComposeBody("");
  };

  const handleSend = async () => {
    if (!composeBody.trim()) return;

    if (!canSend) return;

    if (isNewConversation) {
      if (!selectedRecipient) return;

      const result = await sendMessageMutation.mutateAsync({
        body: composeBody,
        recipientUserId: selectedRecipient.userId,
      });

      setComposeBody("");
      setIsNewConversation(false);
      setRecipientSearch("");
      setSelectedRecipient(null);
      setSelectedThreadId(result.threadId);
      return;
    }

    if (selectedThreadId === null) return;

    await sendMessageMutation.mutateAsync({
      body: composeBody,
      threadId: selectedThreadId,
    });

    setComposeBody("");
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 flex flex-col md:flex-row gap-4 min-h-[400px]">
      {/* THREAD LIST */}
      <div className="w-full md:w-1/3 border border-gray-200 rounded-md flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <h2 className="text-sm font-semibold">Conversations</h2>
          {canSend && (
            <button
              type="button"
              onClick={handleStartNew}
              className="text-xs px-2 py-1 rounded-full bg-lamaPurple text-white"
            >
              New
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {inboxLoading && (
            <div className="p-4 text-sm text-gray-500">Loading conversations...</div>
          )}
          {inboxError && (
            <div className="p-4 text-sm text-red-500">Failed to load conversations.</div>
          )}
          {!inboxLoading && !inboxError && inbox && inbox.threads.length === 0 && (
            <div className="p-4 text-sm text-gray-500">No conversations yet.</div>
          )}
          {!inboxLoading && !inboxError && inbox && inbox.threads.length > 0 && (
            <ul className="divide-y divide-gray-100 text-sm">
              {inbox.threads.map((threadItem) => {
                const isActive = !isNewConversation && selectedThreadId === threadItem.id;
                const title =
                  threadItem.displayName ?? threadItem.subject ?? "Direct message";
                const unread = threadItem.unreadCount ?? 0;
                return (
                  <li
                    key={threadItem.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-lamaPurpleLight ${
                      isActive ? "bg-lamaPurpleLight" : ""
                    }`}
                    onClick={() => handleSelectThread(threadItem.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{title}</span>
                        {threadItem.displayUsername && (
                          <span className="text-[11px] text-gray-500">
                            {threadItem.displayUsername}
                          </span>
                        )}
                      </div>
                      {threadItem.lastMessage && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">
                            {formatTime(threadItem.lastMessage.createdAt)}
                          </span>
                          {unread > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-lamaPurple text-white text-[10px]">
                              {unread}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {threadItem.lastMessage && (
                      <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                        {threadItem.lastMessage.body}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* MESSAGE PANEL */}
      <div className="w-full md:flex-1 border border-gray-200 rounded-md flex flex-col">
        <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {isNewConversation
              ? "New message"
              : ((thread as { subject?: string | null } | undefined)?.subject ?? "Messages")}
          </h2>
          {isNewConversation && (
            <span className="text-[11px] text-gray-500">Search recipient by name or username</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 text-sm">
          {isNewConversation && (
            <div className="mb-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600" htmlFor="recipient-search">
                  Recipient
                </label>
                <input
                  id="recipient-search"
                  type="text"
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  value={recipientSearch}
                  onChange={(e) => {
                    setRecipientSearch(e.target.value);
                    setSelectedRecipient(null);
                  }}
                  placeholder="Search student, parent, teacher, admin, accountant..."
                />
              </div>
              {recipientsLoading && (
                <div className="text-xs text-gray-500">Searching recipients...</div>
              )}
              {recipientsError && (
                <div className="text-xs text-red-500">Failed to search recipients.</div>
              )}
              {!recipientsLoading &&
                !recipientsError &&
                recipientsData &&
                recipientsData.recipients.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded text-xs">
                    {(
                      [
                        { kind: "student", label: "Students" },
                        { kind: "teacher", label: "Teachers" },
                        { kind: "parent", label: "Parents" },
                        { kind: "admin", label: "Admins" },
                        { kind: "accountant", label: "Accountants" },
                      ] as const
                    ).map((section) => {
                      const items = recipientsData.recipients.filter(
                        (r) => r.kind === section.kind,
                      );
                      if (items.length === 0) {
                        return null;
                      }
                      return (
                        <div key={section.kind}>
                          <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase text-gray-500 bg-gray-50">
                            {section.label}
                          </div>
                          <ul className="divide-y divide-gray-100">
                            {items.map((r) => {
                              const isActive = selectedRecipient?.userId === r.userId;
                              return (
                                <li
                                  key={`${r.kind}-${r.userId}`}
                                  className={`px-2 py-1 cursor-pointer hover:bg-lamaPurpleLight ${
                                    isActive ? "bg-lamaPurpleLight" : ""
                                  }`}
                                  onClick={() => setSelectedRecipient(r)}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{r.name}</span>
                                    <span className="ml-2 text-[10px] uppercase text-gray-500">
                                      {r.username}
                                    </span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              {selectedRecipient && (
                <div className="text-[11px] text-gray-600">
                  Selected: <span className="font-medium">{selectedRecipient.name}</span> (
                  {selectedRecipient.kind})
                </div>
              )}
            </div>
          )}

          {!isNewConversation && threadLoading && (
            <div className="text-gray-500">Loading messages...</div>
          )}
          {!isNewConversation && threadError && (
            <div className="text-red-500">Failed to load messages.</div>
          )}

          {!isNewConversation && !threadLoading && !threadError && thread && (
            <ul className="space-y-2">
              {(((thread as { messages?: MessageSummary[] }).messages ?? []) as MessageSummary[]).map(
                (m: MessageSummary) => {
                const isMine = m.senderUserId === session?.user?.id;
                return (
                  <li
                    key={m.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded px-3 py-2 text-xs ${
                        isMine
                          ? "bg-lamaPurple text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p>{m.body}</p>
                      {m.channel === "SMS" && (
                        <p className="mt-1 text-[9px] opacity-75">
                          SMS {m.smsStatus?.toLowerCase() ?? "pending"}
                        </p>
                      )}
                      <p className="mt-1 text-[9px] opacity-75 text-right">
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
              {(((thread as { messages?: MessageSummary[] }).messages ?? []) as MessageSummary[])
                .length === 0 && (
                <li className="text-xs text-gray-500">No messages in this conversation yet.</li>
              )}
            </ul>
          )}

          {!isNewConversation && selectedThreadId === null && !threadLoading && !threadError && (
            <div className="text-xs text-gray-500">
              Select a conversation from the left, or start a new message.
            </div>
          )}
        </div>

        {/* COMPOSE AREA */}
        <div className="border-t border-gray-200 p-3 flex flex-col gap-2">
          {!canSend && (
            <p className="text-[11px] text-gray-500">
              You can read messages here. Only admins and teachers can send messages.
            </p>
          )}
          {canSend && (
            <>
              <textarea
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none h-20"
                placeholder={
                  isNewConversation
                    ? "Type your message to start a new conversation"
                    : "Type your message"
                }
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={
                    sendMessageMutation.isPending ||
                    !composeBody.trim() ||
                    (isNewConversation && !selectedRecipient)
                  }
                  className="px-4 py-1.5 rounded-full bg-lamaPurple text-white text-xs disabled:opacity-60"
                >
                  {sendMessageMutation.isPending ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesClient;
