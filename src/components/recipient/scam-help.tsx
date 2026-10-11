"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconCheck,
  IconMessageCircle,
  IconShieldAlert,
} from "~/components/icons";
import { ReadAloudButton } from "~/components/recipient/read-aloud-button";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

const STEPS = [
  {
    title: "Stop. Don't pay anything.",
    detail:
      "No real company or government office will rush you to pay right now.",
  },
  {
    title: "Don't share codes or passwords.",
    detail:
      "Never give out gift card numbers, bank details, passwords, or codes sent to your phone.",
  },
  {
    title: "Hang up or close the message.",
    detail: "It's okay to be rude to a scammer. You can always check later.",
  },
  {
    title: "If you already paid or shared something, call your bank.",
    detail:
      "Use the phone number on the back of your card, not a number they gave you.",
  },
];

const SITUATIONS = [
  "A phone call",
  "A text or email",
  "Someone at my door",
  "Something on my computer",
  "Something else",
];

type Caregiver = { connectionId: string; name: string };

function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function ScamHelp({
  userId,
  caregivers,
}: {
  userId: string;
  caregivers: Caregiver[];
}) {
  const [situation, setSituation] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const caregiverNames = joinNames(caregivers.map((c) => c.name));
  const stepsSpeech = [
    "You did the right thing by stopping.",
    ...STEPS.map((s, i) => `Step ${i + 1}. ${s.title} ${s.detail}`),
  ].join(" ");

  async function alertCaregivers() {
    setSending(true);
    setError(null);
    const body = [
      "🚨 I pressed the scam help button in GoldenGuide.",
      situation ? `It's about: ${situation.toLowerCase()}.` : null,
      "Please call or message me as soon as you can.",
    ]
      .filter(Boolean)
      .join(" ");

    const supabase = createClient();
    const { error: sendError } = await supabase.from("messages").insert(
      caregivers.map((c) => ({
        connection_id: c.connectionId,
        sender_id: userId,
        body,
      })),
    );
    setSending(false);

    if (sendError) {
      setError(
        "Sorry, the message didn't send. Please try again, or call someone you trust.",
      );
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <IconShieldAlert className="size-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Worried it's a scam?
          </h1>
          <p className="text-xl">
            You did the right thing by stopping. Take a breath. Follow these
            steps.
          </p>
        </div>
      </div>

      <ReadAloudButton
        text={stepsSpeech}
        label="Listen to the steps"
        className="w-fit"
      />

      <ol className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <Card className="border-2">
              <CardContent className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-xl font-semibold">{step.title}</p>
                  <p className="text-lg">{step.detail}</p>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      {caregivers.length === 0 ? (
        <Card className="border-2 border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold">
              Talk to someone you trust
            </h2>
            <p className="text-xl">
              Before you do anything else, call a family member or friend and
              tell them what happened.
            </p>
            <p className="text-lg">
              Tip: if you connect a caregiver on the Home page, this page can
              alert them for you next time.
            </p>
          </CardContent>
        </Card>
      ) : sent ? (
        <Card className="border-2 border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-4" role="status">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <IconCheck className="size-6" />
              </div>
              <h2 className="text-2xl font-semibold">
                We told {caregiverNames}
              </h2>
            </div>
            <p className="text-xl">
              They'll get in touch soon. Until then, don't pay anything or share
              any information.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {caregivers.map((c) => (
                <Button key={c.connectionId} asChild size="xl">
                  <Link href={`/messages/${c.connectionId}`}>
                    <IconMessageCircle />
                    {caregivers.length > 1
                      ? `Messages with ${c.name}`
                      : "Open my messages"}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold">
                Let {caregiverNames} know
              </h2>
              <p className="text-xl">
                We'll send them a message asking them to contact you.
              </p>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-xl">
                What is happening? (You can skip this.)
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {SITUATIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setSituation(situation === option ? null : option)
                    }
                    aria-pressed={situation === option}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-lg transition-colors",
                      situation === option
                        ? "border-primary bg-primary/10 font-semibold"
                        : "border-border bg-card hover:border-primary hover:bg-accent",
                    )}
                  >
                    {situation === option && (
                      <IconCheck className="size-5 shrink-0 text-primary" />
                    )}
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && <p className="text-lg text-destructive">{error}</p>}

            <Button
              size="xl"
              onClick={alertCaregivers}
              disabled={sending}
              className="w-full sm:w-fit"
            >
              <IconMessageCircle />
              {sending ? "Sending..." : `Tell ${caregiverNames} now`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
