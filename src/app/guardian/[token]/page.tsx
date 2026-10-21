import type { Metadata } from "next";
import { GuardianDecision } from "~/components/guardian-decision";
import { Card, CardContent } from "~/components/ui/card";
import { createClient } from "~/lib/supabase/server";

// The link in the address bar is the parent's key: keep it out of search
// engines and out of the Referer header when leaving the page.
export const metadata: Metadata = {
  title: "Approve a student volunteer",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Preview = {
  state: "open" | "decided" | "expired" | "invalid";
  decision?: "approved" | "declined" | null;
  student_name?: string;
};

export default async function GuardianApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("guardian_consent_preview", {
    p_token: token,
  });
  const preview = (data as Preview | null) ?? { state: "invalid" };
  const name = preview.student_name ?? "This student";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      {preview.state === "open" ? (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {name} would like to volunteer
            </h1>
            <p className="text-muted-foreground">
              GoldenGuide helps older adults learn everyday skills. Students
              under 18 need a parent or guardian's approval to volunteer.
            </p>
          </div>

          <Card>
            <CardContent className="flex flex-col gap-3 py-6 text-sm">
              <h2 className="text-base font-semibold">
                What volunteering means
              </h2>
              <ul className="flex list-disc flex-col gap-2 pl-5">
                <li>
                  A caregiver {name} knows invites them with a private code.
                  They can't browse or contact families on their own.
                </li>
                <li>
                  They teach things like video calls, budgeting and spotting
                  scams, in short sessions by{" "}
                  <strong>video or phone call</strong>. There are no in-person
                  visits.
                </li>
                <li>
                  The family's caregiver approves every session and confirms the
                  time given. {name} can download a record of verified hours.
                </li>
                <li>
                  We keep their name, the families they volunteer with, their
                  sessions and hours. Older adults only see their first name.
                </li>
                <li>You can ask us to delete their account at any time.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <GuardianDecision token={token} studentName={name} />
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            {preview.state === "decided"
              ? "Thanks, we have your answer"
              : "This link can't be used"}
          </h1>
          <p className="text-muted-foreground">
            {preview.state === "decided"
              ? preview.decision === "approved"
                ? `You approved ${name}.`
                : `You declined ${name}'s request.`
              : preview.state === "expired"
                ? "It has expired or a newer link was sent. Ask the student to send a new one."
                : "Please check you opened the whole link from the email."}
          </p>
        </div>
      )}
    </main>
  );
}
