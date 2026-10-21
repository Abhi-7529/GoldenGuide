"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { requestGuardianApproval } from "~/app/student/guardian-actions";
import {
  IconArrowLeft,
  IconBook,
  IconUser,
  IconUsers,
} from "~/components/icons";
import {
  LearningPlanForm,
  type PlanAnswers,
  savePlan,
} from "~/components/recipient/learning-plan-form";
import { deviceTimeZone } from "~/components/time-zone-sync";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { env } from "~/env";
import {
  INVITATION_CODE_PLACEHOLDER,
  type RedeemResult,
} from "~/lib/community";
import { homeForRole, type Role } from "~/lib/roles";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

type AgeGroup = "under_16" | "16_17" | "18_plus";

const AGE_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "under_16", label: "Under 16" },
  { value: "16_17", label: "16 or 17" },
  { value: "18_plus", label: "18 or older" },
];

type Step =
  | "checking"
  | "choose"
  | "plan"
  | "caregiver-topics"
  | "code"
  | "code-shown"
  | "student"
  | "student-joined";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("checking");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  // Plan answers are kept here so Back never loses them. Nothing is saved
  // until the last step, so people can go back and fix their name or role.
  const [plan, setPlan] = useState<PlanAnswers | null>(null);
  const [profileCreated, setProfileCreated] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [studentCode, setStudentCode] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [parentEmail, setParentEmail] = useState("");
  const [joinedCaregiver, setJoinedCaregiver] = useState<string | null>(null);
  // For 16- and 17-year-olds: whether the parent's email went out.
  const [guardianNote, setGuardianNote] = useState<string | null>(null);
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
        router.replace(homeForRole(profile.role));
        return;
      }

      setStep("choose");
    })();
  }, [router]);

  function handleChooseRole(chosen: Role) {
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError(null);
    if (chosen !== role) setPlan(null);
    setRole(chosen);
    setStep(
      chosen === "caregiver"
        ? "caregiver-topics"
        : chosen === "student"
          ? "student"
          : "plan",
    );
  }

  /** Creates the profile once, then saves any plan answers. */
  async function saveAccount(
    answers: PlanAnswers | null,
  ): Promise<
    { userId: string; error: null } | { userId: null; error: string }
  > {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !role) {
      router.replace("/login");
      return { userId: null, error: "Please sign in again." };
    }
    const userId = userData.user.id;

    if (!profileCreated) {
      const { data: profile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          role,
          full_name: fullName.trim(),
          time_zone: deviceTimeZone(),
        })
        .select("invite_code")
        .single();
      if (insertError) return { userId: null, error: insertError.message };
      setProfileCreated(true);
      setGeneratedCode(profile?.invite_code ?? null);
    }

    if (answers && (role === "care_recipient" || answers.topics.length > 0)) {
      const planError = await savePlan(
        userId,
        role === "caregiver" ? "caregiver" : "learner",
        answers,
      );
      if (planError) return { userId: null, error: planError };
    }
    return { userId, error: null };
  }

  /** Returns an error message, if saving failed. */
  async function finishCaregiver(answers: PlanAnswers | null) {
    setError(null);
    const { error: saveError } = await saveAccount(answers);
    if (!saveError) setStep("code-shown");
    return saveError;
  }

  async function finishLearner(withCode: boolean) {
    setError(null);
    setLoading(true);
    const { error: saveError } = await saveAccount(plan);
    if (saveError) {
      setLoading(false);
      setError(saveError);
      return;
    }

    if (withCode) {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("redeem_invite_code", {
        p_code: inviteCode.trim().toUpperCase(),
      });
      if (rpcError) {
        setLoading(false);
        setError(rpcError.message);
        return;
      }
    }

    router.push("/home");
    router.refresh();
  }

  /**
   * Student accounts only exist through a caregiver's invitation code. The
   * database checks the code and creates the account in one step, so there's
   * no student profile at all unless the code was good.
   */
  async function finishStudent(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "redeem_student_invitation",
      {
        p_code: studentCode,
        p_display_name: fullName.trim(),
        p_age_group: ageGroup,
        p_time_zone: deviceTimeZone(),
      },
    );
    const result = data as RedeemResult | null;
    if (rpcError || !result) {
      setLoading(false);
      setError(rpcError?.message ?? "Something went wrong. Please try again.");
      return;
    }
    if (!result.ok) {
      setLoading(false);
      setError(result.error);
      return;
    }
    if (result.needs_guardian) {
      const sent = await requestGuardianApproval(parentEmail);
      setGuardianNote(
        sent.ok
          ? `We emailed ${parentEmail.trim()} to ask for their approval. You can start helping once they say yes.`
          : `${sent.error} You can send it again from your dashboard.`,
      );
    }
    setLoading(false);
    setJoinedCaregiver(result.caregiver_name);
    setStep("student-joined");
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
                role === "care_recipient" && "border-2 border-primary",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <IconUser className="size-6 text-primary-strong" />
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
                role === "caregiver" && "border-2 border-primary",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <IconUsers className="size-6 text-primary-strong" />
              <span className="font-semibold">I'm a caregiver</span>
              <span className="text-sm text-muted-foreground">
                Support a family member's progress.
              </span>
            </button>
            {env.NEXT_PUBLIC_COMMUNITY_ENABLED && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleChooseRole("student")}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border border-border p-5 text-left transition-colors hover:bg-accent sm:col-span-2",
                  role === "student" && "border-2 border-primary",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <IconBook className="size-6 text-primary-strong" />
                <span className="font-semibold">I'm a student volunteer</span>
                <span className="text-sm text-muted-foreground">
                  Help older adults learn new skills. You'll need an invitation
                  code from a caregiver.
                </span>
              </button>
            )}
          </div>

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </>
      )}

      {step === "student" && (
        <form onSubmit={finishStudent} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Enter your invitation code
            </h1>
            <p className="text-muted-foreground">
              Student volunteers join through a caregiver they know. Ask them
              for a code from their GoldenGuide Community page.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="studentCode">Invitation code</Label>
            <Input
              id="studentCode"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              placeholder={INVITATION_CODE_PLACEHOLDER}
              autoComplete="off"
              required
            />
            <p className="text-sm text-muted-foreground">
              Families will see you as "{fullName.trim()}". You can change this
              later.
            </p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              How old are you?
            </legend>
            {AGE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex w-fit items-center gap-3 text-sm"
              >
                <input
                  type="radio"
                  name="ageGroup"
                  value={option.value}
                  checked={ageGroup === option.value}
                  onChange={() => setAgeGroup(option.value)}
                  className="size-5 shrink-0 accent-primary"
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          {ageGroup === "under_16" && (
            <p className="rounded-xl border border-border bg-accent/40 p-3 text-sm">
              Student volunteers need to be 16 or older. Thank you for wanting
              to help! You're welcome to come back when you're 16.
            </p>
          )}

          {ageGroup === "16_17" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parentEmail">Parent or guardian's email</Label>
              <Input
                id="parentEmail"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                autoComplete="off"
                required
              />
              <p className="text-sm text-muted-foreground">
                We'll email them to approve you. You can join now, and start
                helping once they say yes.
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={
                loading ||
                !studentCode.trim() ||
                !ageGroup ||
                ageGroup === "under_16" ||
                (ageGroup === "16_17" && !parentEmail.trim())
              }
            >
              {loading ? "Checking..." : "Join"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError(null);
                setStep("choose");
              }}
              disabled={loading}
            >
              <IconArrowLeft />
              Back
            </Button>
          </div>
        </form>
      )}

      {step === "student-joined" && joinedCaregiver && (
        <>
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome aboard
            </h1>
            <p className="text-muted-foreground">
              You've joined {joinedCaregiver}'s community. They'll choose who
              you can help, and you can add the skills you'd like to teach.
            </p>
          </div>
          {guardianNote && (
            <p className="rounded-xl border border-border bg-accent/40 p-3 text-sm">
              {guardianNote}
            </p>
          )}
          <Button
            onClick={() => {
              router.push("/student");
              router.refresh();
            }}
          >
            Continue to my dashboard
          </Button>
        </>
      )}

      {step === "plan" && (
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
            mode="learner"
            initial={plan}
            startAtEnd={plan !== null}
            saveLabel="Next"
            onSubmit={async (answers) => {
              setPlan(answers);
              setStep("code");
              return null;
            }}
            onBack={
              profileCreated
                ? undefined
                : (answers) => {
                    setPlan(answers);
                    setStep("choose");
                  }
            }
            onSkip={() => {
              setPlan(null);
              setStep("code");
            }}
          />
        </>
      )}

      {step === "caregiver-topics" && (
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
            mode="caregiver"
            initial={plan}
            saveLabel="Save and continue"
            onSubmit={(answers) => {
              setPlan(answers);
              return finishCaregiver(answers);
            }}
            onBack={
              profileCreated
                ? undefined
                : (answers) => {
                    setPlan(answers);
                    setStep("choose");
                  }
            }
            onSkip={async () => {
              setPlan(null);
              setLoading(true);
              const skipError = await finishCaregiver(null);
              setLoading(false);
              setError(skipError);
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
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
              onClick={() => finishLearner(true)}
              disabled={loading || !inviteCode.trim()}
            >
              {loading ? "Connecting..." : "Connect"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => finishLearner(false)}
              disabled={loading}
            >
              Skip for now
            </Button>
            {/* Once the account exists (a code failed), role and name are set. */}
            {!profileCreated && (
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep("plan");
                }}
                disabled={loading}
              >
                <IconArrowLeft />
                Back
              </Button>
            )}
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
