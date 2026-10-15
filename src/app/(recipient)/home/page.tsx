import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconArrowRight,
  IconBook,
  IconCalculator,
  IconTarget,
} from "~/components/icons";
import { ConnectCaregiverCard } from "~/components/recipient/connect-caregiver-card";
import { TodaysLessons } from "~/components/recipient/todays-lessons";
import { TopicSuggestionCard } from "~/components/recipient/topic-suggestion-card";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { loadTopicSuggestions } from "~/lib/learning-plan";
import { loadLearnerDay } from "~/lib/membership";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

const choices = [
  {
    href: "/learn",
    icon: IconBook,
    title: "Read a lesson",
    description:
      "Short, simple lessons about budgeting, bills, scams, and more.",
    action: "Go to lessons",
  },
  {
    href: "/practice",
    icon: IconTarget,
    title: "Practice a money choice",
    description: "Try a real-life situation. There is no wrong answer here.",
    action: "Start practicing",
  },
  {
    href: "/budget",
    icon: IconCalculator,
    title: "Plan a budget",
    description: "Plan your own money, or practice with a made-up example.",
    action: "Open the calculator",
  },
];

export default async function RecipientHomePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  const { data: connectionRows } = await supabase.rpc("get_my_connections");
  const connections = (connectionRows as Connection[] | null) ?? [];
  const [day, topicSuggestions] = await Promise.all([
    loadLearnerDay(supabase, userId),
    loadTopicSuggestions(supabase, { recipientId: userId }),
  ]);
  const { plan } = day;
  // A learner has at most one caregiver.
  const caregiverName = connections[0]
    ? connections[0].partner_full_name || "Your caregiver"
    : null;
  const planTopics = plan?.topics ?? [];
  const seenTopics = new Set<string>(planTopics);
  const pendingTopics = topicSuggestions.filter((s) => {
    if (seenTopics.has(s.topic)) return false;
    seenTopics.add(s.topic);
    return true;
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-xl">What would you like to do today?</p>
      </div>

      {pendingTopics.map((s) => (
        <TopicSuggestionCard
          key={s.id}
          suggestion={s}
          caregiverName={caregiverName ?? "Your caregiver"}
          planTopics={planTopics}
        />
      ))}

      <TodaysLessons day={day} caregiverName={caregiverName} />

      {plan ? (
        <Link
          href="/plan"
          className="-mt-4 w-fit text-lg font-medium text-primary underline-offset-4 hover:underline"
        >
          Change my learning plan
        </Link>
      ) : (
        <Card className="border-2 border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">
              Make your own learning plan
            </h2>
            <p className="text-xl">
              Answer three short questions
              {caregiverName
                ? ` so ${caregiverName} can choose lessons that suit you.`
                : ", and we'll pick lessons that suit you."}
            </p>
            <Button asChild size="xl" className="w-full sm:w-fit">
              <Link href="/plan">
                Get started
                <IconArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {choices.map((choice) => {
          const Icon = choice.icon;
          return (
            <Link key={choice.href} href={choice.href} className="group">
              <Card className="h-full border-2 transition-colors group-hover:border-primary group-hover:bg-accent">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-7" />
                  </div>
                  <h2 className="text-2xl font-semibold">{choice.title}</h2>
                  <p className="text-lg">{choice.description}</p>
                  <span className="mt-auto flex items-center gap-2 pt-2 text-lg font-semibold text-primary">
                    {choice.action}
                    <IconArrowRight className="size-5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {connections.length === 0 && <ConnectCaregiverCard />}
    </div>
  );
}
