import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IconX } from "~/components/icons";
import { ChatPanel } from "~/components/messages/chat-panel";
import { createClient } from "~/lib/supabase/server";

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: connection } = await supabase
    .from("connections")
    .select("id, caregiver_id, care_recipient_id")
    .eq("id", connectionId)
    .maybeSingle();

  if (!connection) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: true });

  const backHref =
    userData.user.id === connection.caregiver_id
      ? "/caregiver/connection"
      : "/home";

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-6 py-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-lg font-semibold">Messages</h1>
        <Link
          href={backHref}
          aria-label="Close messages"
          className="text-muted-foreground hover:text-foreground"
        >
          <IconX className="size-5" />
        </Link>
      </div>
      <ChatPanel
        connectionId={connectionId}
        currentUserId={userData.user.id}
        initialMessages={messages ?? []}
      />
    </div>
  );
}
