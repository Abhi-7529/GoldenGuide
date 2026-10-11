import Link from "next/link";
import { redirect } from "next/navigation";
import { IconArrowRight, IconBook, IconTarget } from "~/components/icons";
import { ConnectCaregiverCard } from "~/components/recipient/connect-caregiver-card";
import { TodaysLessons } from "~/components/recipient/todays-lessons";
import { TopicSuggestionCard } from "~/components/recipient/topic-suggestion-card";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { loadTopicSuggestions, topicLabel } from "~/lib/learning-plan";
import { loadLearnerDay } from "~/lib/membership";
import { loadLearnerSuggestions } from "~/lib/suggestions";
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
  const { plan, path, completions } = day;
  // Assigned lessons are a Family feature; on Free, today's lessons rule.
  const suggestions = day.unlimited
    ? await loadLearnerSuggestions(supabase, userId, connections, completions)
    : [];
  const caregiverNames = new Map(
    connections.map((c) => [
      c.partner_id,
      c.partner_full_name || "Your caregiver",
    ]),
  );

  // Suggested lessons already have their own card above, so skip them here.
  const suggestedIds = new Set(suggestions.map((s) => s.lesson_id));
  const nextLesson = path.lessons.find((l) => !suggestedIds.has(l.item.id));
  const nextPractice = day.practice[0];
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

      {suggestions.map((s) => (
        <Card key={s.id} className="border-2 border-primary bg-primary/5">
          <CardContent className="flex flex-col gap-4">
            <p className="text-lg font-medium">
              {s.caregiver_name} chose a lesson for you
            </p>
            <p className="text-2xl font-semibold leading-snug">
              {s.lesson_title}
            </p>
            {s.note && (
              <p className="text-xl italic">
                “{s.note}” — {s.caregiver_name}
              </p>
            )}
            <Button asChild size="xl" className="w-full sm:w-fit">
              <Link href={`/learn/${s.lesson_id}`}>
                Start this lesson
                <IconArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}

      {pendingTopics.map((s) => (
        <TopicSuggestionCard
          key={s.id}
          suggestion={s}
          caregiverName={caregiverNames.get(s.caregiver_id) ?? "Your caregiver"}
          planTopics={planTopics}
        />
      ))}

      {!day.unlimited && (
        <TodaysLessons
          lessons={day.todayLessons}
          doneToday={day.doneToday}
          pickerName={
            day.pickedBy
              ? (caregiverNames.get(day.pickedBy) ?? "Your caregiver")
              : null
          }
        />
      )}
      {!day.unlimited && plan && (
        <Link
          href="/plan"
          className="-mt-4 w-fit text-lg font-medium text-primary underline-offset-4 hover:underline"
        >
          Change my learning plan
        </Link>
      )}

      {plan ? (
        day.unlimited &&
        (nextLesson || nextPractice) && (
          <Card className="border-2">
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold">Picked for you</h2>
                {planTopics.length > 0 && (
                  <p className="text-lg text-muted-foreground">
                    Your plan: {planTopics.map(topicLabel).join(", ")}
                  </p>
                )}
              </div>
              {path.levelNote && <p className="text-lg">{path.levelNote}</p>}
              {nextLesson && (
                <div className="flex flex-col gap-3 rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
                  <p className="text-lg font-medium text-muted-foreground">
                    Next lesson · {nextLesson.reason}
                  </p>
                  <p className="text-2xl font-semibold leading-snug">
                    {nextLesson.item.title}
                  </p>
                  <Button asChild size="xl" className="w-full sm:w-fit">
                    <Link href={`/learn/${nextLesson.item.id}`}>
                      Start this lesson
                      <IconArrowRight />
                    </Link>
                  </Button>
                </div>
              )}
              {nextPractice && (
                <div className="flex flex-col gap-3 rounded-xl border-2 border-border p-4">
                  <p className="text-lg font-medium text-muted-foreground">
                    Practice · {nextPractice.reason}
                  </p>
                  <p className="text-2xl font-semibold leading-snug">
                    {nextPractice.item.title}
                  </p>
                  <Button
                    asChild
                    size="xl"
                    variant="outline"
                    className="w-full sm:w-fit"
                  >
                    <Link href="/practice">
                      Practice this
                      <IconArrowRight />
                    </Link>
                  </Button>
                </div>
              )}
              <Link
                href="/plan"
                className="w-fit text-lg font-medium text-primary underline-offset-4 hover:underline"
              >
                Change my learning plan
              </Link>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-2 border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">
              Make your own learning plan
            </h2>
            <p className="text-xl">
              Answer three short questions, and we'll pick lessons that suit
              you.
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

      <div className="grid gap-4 sm:grid-cols-2">
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
