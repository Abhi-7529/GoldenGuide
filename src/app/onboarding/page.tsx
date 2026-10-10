"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconUser, IconUsers } from "~/components/icons";
import { LearningPlanForm } from "~/components/recipient/learning-plan-form";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

type Role = "caregiver" | "care_recipient";
type Step =
  | "checking"
  | "choose"
  | "plan"
  | "caregiver-topics"
  | "code"
  | "code-shown";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profile) {
        router.replace(profile.role === "caregiver" ? "/caregiver" : "/home");
        return;
      }

      setStep("choose");
    })();
  }, [router]);

  async function handleChooseRole(role: Role) {
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }

    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: userData.user.id, role, full_name: fullName.trim() })
      .select("invite_code")
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setUserId(userData.user.id);
    if (role === "caregiver") {
      setGeneratedCode(profile?.invite_code ?? null);
      setStep("caregiver-topics");
    } else {
      setStep("plan");
    }
  }

  async function handleRedeemCode() {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("redeem_invite_code", {
      p_code: inviteCode.trim().toUpperCase(),
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  function handleSkipCode() {
    router.push("/home");
    router.refresh();
  }

  if (step === "checking") {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main
      className={cn(
        "mx-auto flex min-h-[calc(100vh-4rem)] flex-col justify-center gap-6 px-6 py-16",
        step === "plan" || step === "caregiver-topics"
          ? "max-w-2xl"
          : "max-w-lg",
      )}
    >
      {step === "choose" && (
        <>
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome to GoldenGuide
            </h1>
            <p className="text-muted-foreground">Let's set up your account.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Your name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Susan Miller"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleChooseRole("care_recipient")}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border border-border p-5 text-left transition-colors hover:bg-accent",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <IconUser className="size-6 text-primary" />
              <span className="font-semibold">I'm learning for myself</span>
              <span className="text-sm text-muted-foreground">
                Take lessons and practice financial decisions.
              </span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleChooseRole("caregiver")}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border border-border p-5 text-left transition-colors hover:bg-accent",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <IconUsers className="size-6 text-primary" />
              <span className="font-semibold">I'm a caregiver</span>
              <span className="text-sm text-muted-foreground">
                Support a family member's progress.
              </span>
            </button>
          </div>

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </>
      )}

      {step === "plan" && userId && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Let's make your learning plan
            </h1>
            <p className="text-xl">
              Answer three short questions, and we'll pick lessons that suit
              you.
            </p>
          </div>
          <LearningPlanForm
            userId={userId}
            mode="learner"
            onSaved={() => setStep("code")}
            onSkip={() => setStep("code")}
          />
        </>
      )}

      {step === "caregiver-topics" && userId && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              What should they learn about?
            </h1>
            <p className="text-muted-foreground">
              Optional. You can also suggest topics later from your dashboard.
            </p>
          </div>
          <LearningPlanForm
            userId={userId}
            mode="caregiver"
            saveLabel="Save and continue"
            onSaved={() => setStep("code-shown")}
            onSkip={() => setStep("code-shown")}
          />
        </>
      )}

      {step === "code" && (
        <>
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Connect with your caregiver
            </h1>
            <p className="text-muted-foreground">
              If someone gave you an invite code, enter it below. You can also
              skip this and connect later.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inviteCode">Invite code</Label>
            <Input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. 4F2A9C"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleRedeemCode}
              disabled={loading || !inviteCode.trim()}
            >
              {loading ? "Connecting..." : "Connect"}
            </Button>
            <Button variant="ghost" onClick={handleSkipCode} disabled={loading}>
              Skip for now
            </Button>
          </div>
        </>
      )}

      {step === "code-shown" && generatedCode && (
        <>
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              You're all set
            </h1>
            <p className="text-muted-foreground">
              Share this code with the person you're supporting so they can
              connect their account to yours.
            </p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Your invite code
              </span>
              <span className="text-3xl font-bold tracking-[0.3em]">
                {generatedCode}
              </span>
            </CardContent>
          </Card>

          <Button
            onClick={() => {
              router.push("/caregiver");
              router.refresh();
            }}
          >
            Continue to dashboard
          </Button>
        </>
      )}
    </main>
  );
}
