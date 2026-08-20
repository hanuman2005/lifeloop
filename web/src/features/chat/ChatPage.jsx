// Real-time chat between a donor and a recipient.
//
// Messages are sent over the socket rather than the REST endpoint, because the
// server broadcasts to the chat room from the socket handler — posting over HTTP
// would persist the message but not deliver it live to the other participant.
// History is loaded over REST, since the socket only carries new traffic.

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { chatAPI } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { useSocket, useSocketEvent } from "@/features/realtime/SocketContext";
import { cn } from "@/lib/utils";

function otherParticipant(chat, myId) {
  const participants = chat?.participants || [];
  return participants.find((person) => String(person?._id || person) !== String(myId));
}

function displayName(person) {
  if (!person || typeof person === "string") return "Conversation";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || "Conversation";
}

export default function ChatPage() {
  const { user } = useAuth();
  const { emit, connected } = useSocket();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  const activeId = params.get("c");
  const [draft, setDraft] = useState("");
  const [liveMessages, setLiveMessages] = useState([]);
  const bottomRef = useRef(null);

  const chats = useQuery({
    queryKey: ["chats"],
    queryFn: async () => (await chatAPI.getUserChats()).data,
  });

  const history = useQuery({
    queryKey: ["chat-messages", activeId],
    queryFn: async () => (await chatAPI.getMessages(activeId)).data,
    enabled: Boolean(activeId),
  });

  // Joining the room is what makes the server deliver this chat's traffic here.
  useEffect(() => {
    if (activeId && connected) emit("joinChat", activeId);
    setLiveMessages([]);
  }, [activeId, connected, emit]);

  useSocketEvent("newMessage", (payload) => {
    if (!payload?.chatId || String(payload.chatId) !== String(activeId)) {
      // A message for a different conversation still changes the list ordering.
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      return;
    }
    setLiveMessages((prev) => [...prev, payload.message]);
  });

  const messages = useMemo(() => {
    const stored = history.data?.messages || history.data?.data || [];
    // The socket echoes the sender's own message back, so a message that arrived
    // live may already be present in a refetched history.
    const seen = new Set(stored.map((message) => String(message._id)));
    return [...stored, ...liveMessages.filter((message) => !seen.has(String(message._id)))];
  }, [history.data, liveMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function send(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !activeId) return;
    emit("sendMessage", { chatId: activeId, content, messageType: "text" });
    setDraft("");
  }

  const conversations = chats.data?.chats || chats.data?.data || [];
  const activeChat = conversations.find((chat) => String(chat._id) === String(activeId));

  // Mobile shows one pane at a time; desktop shows both.
  const showList = !activeId;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        {activeId && (
          <Button variant="ghost" size="sm" className="-ml-2 md:hidden" onClick={() => setParams({})}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Messages</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {connected ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Connected
              </span>
            ) : (
              "Reconnecting…"
            )}
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Conversation list */}
        <div className={cn("space-y-2", !showList && "hidden md:block")}>
          {chats.isLoading && <LoadingState label="Loading conversations" />}
          {!chats.isLoading && conversations.length === 0 && (
            <EmptyState
              title="No conversations"
              description="Express interest in an item to start talking to the donor."
            />
          )}
          {conversations.map((chat) => {
            const person = otherParticipant(chat, user?._id);
            return (
              <button
                key={chat._id}
                type="button"
                onClick={() => setParams({ c: chat._id })}
                className={cn(
                  "w-full rounded-md border p-3 text-left transition-colors",
                  String(chat._id) === String(activeId)
                    ? "border-accent bg-accent-tint"
                    : "border-border hover:bg-secondary",
                )}
              >
                <div className="truncate text-[13.5px] font-medium">{displayName(person)}</div>
                {chat.lastMessage?.content && (
                  <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                    {chat.lastMessage.content}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Thread */}
        <div className={cn(showList && "hidden md:block")}>
          {!activeId && (
            <Card>
              <CardContent className="py-14 text-center text-[13.5px] text-muted-foreground">
                Pick a conversation.
              </CardContent>
            </Card>
          )}

          {activeId && (
            <Card className="flex h-[540px] flex-col">
              <div className="border-b border-border px-4 py-3 text-[14px] font-medium">
                {displayName(otherParticipant(activeChat, user?._id))}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {history.isLoading && <LoadingState label="Loading messages" />}
                {messages.map((message) => {
                  const senderId = message.sender?._id || message.sender;
                  const mine = String(senderId) === String(user?._id);
                  return (
                    <div
                      key={message._id}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-md px-3 py-2 text-[13.5px]",
                          mine
                            ? "bg-accent text-accent-foreground"
                            : "border border-border bg-secondary",
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a message"
                  autoComplete="off"
                />
                <Button type="submit" size="icon" disabled={!draft.trim() || !connected}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
