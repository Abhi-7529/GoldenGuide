"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function ChatPanel({
  connectionId,
  currentUserId,
  initialMessages,
}: {
  connectionId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function poll() {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("connection_id", connectionId)
        .order("created_at", { ascending: true });

      if (!cancelled && data) {
        setMessages((prev) =>
          data.length === prev.length ? prev : (data as Message[]),
        );
      }
    }

    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [connectionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    setDraft("");

    const supabase = createClient();
    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        connection_id: connectionId,
        sender_id: currentUserId,
        body,
      })
      .select()
      .single();

    if (!error && inserted) {
      const message = inserted as Message;
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
    }

    setSending(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={cn("flex", isMine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                  isMine ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-border pt-4"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
