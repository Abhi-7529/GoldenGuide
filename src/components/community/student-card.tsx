"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  type CommunityLearner,
  type CommunityStudent,
  SKILL_CATEGORIES,
} from "~/lib/community";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

function longDate(when: string) {
  return new Date(when).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function StudentCard({
  student,
  learners,
}: {
  student: CommunityStudent;
  learners: CommunityLearner[];
}) {
  const router = useRouter();
  const isActive = student.status === "active";
  // Saved choices come from the server; this keeps the boxes in step while
  // a change is on its way.
  const [allowed, setAllowed] = useState(() => new Set(student.learner_ids));
  const [busyLearner, setBusyLearner] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleLearner(learnerId: string, allow: boolean) {
    setError(null);
    setBusyLearner(learnerId);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc(
      "set_student_learner_access",
      { p_student: student.id, p_learner: learnerId, p_allowed: allow },
    );
    setBusyLearner(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setAllowed((current) => {
      const next = new Set(current);
      if (allow) next.add(learnerId);
      else next.delete(learnerId);
      return next;
    });
    router.refresh();
  }

  async function remove() {
    setError(null);
    setRemoving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("remove_community_student", {
      p_student: student.id,
    });
    setRemoving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setConfirmingRemove(false);
    router.refresh();
  }

  return (
    <Card className={cn(!isActive && "opacity-80")}>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-lg font-semibold">
              {student.display_name}
            </span>
            <span
              className="text-sm text-muted-foreground"
              suppressHydrationWarning
            >
              {isActive
                ? `Joined ${longDate(student.joined_at)}`
                : `Removed ${longDate(student.removed_at ?? student.joined_at)}`}
            </span>
          </div>
          {!isActive && <Badge variant="outline">No longer active</Badge>}
        </div>

        {(student.intro || student.availability || student.interests) && (
          <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
            {student.intro && (
              <>
                <dt className="text-muted-foreground">About</dt>
                <dd>{student.intro}</dd>
              </>
            )}
            {student.availability && (
              <>
                <dt className="text-muted-foreground">Usually free</dt>
                <dd>{student.availability}</dd>
              </>
            )}
            {student.interests && (
              <>
                <dt className="text-muted-foreground">Interested in</dt>
                <dd>{student.interests}</dd>
              </>
            )}
          </dl>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Can teach</span>
          {student.skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No skills listed yet.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {student.skills.map((skill) => (
                <li
                  key={skill.id}
                  className="rounded-full border border-border bg-card px-3 py-1 text-sm"
                  title={skill.description || undefined}
                >
                  {skill.title}
                  <span className="text-muted-foreground">
                    {" "}
                    · {SKILL_CATEGORIES[skill.category] ?? "Other"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isActive && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              Who can {student.display_name.split(" ")[0]} help?
            </legend>
            {learners.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Connect with the person you support first, from Manage
                Connection.
              </p>
            ) : (
              learners.map((learner) => {
                const checked = allowed.has(learner.id);
                return (
                  <label
                    key={learner.id}
                    className="flex w-fit items-center gap-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busyLearner === learner.id}
                      onChange={(e) =>
                        void toggleLearner(learner.id, e.target.checked)
                      }
                      className="size-5 shrink-0 accent-primary"
                    />
                    {learner.name}
                  </label>
                );
              })
            )}
            <p className="text-sm text-muted-foreground">
              They only see a first name. Unticking someone cancels their
              upcoming sessions together.
            </p>
          </fieldset>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {isActive &&
          (confirmingRemove ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-destructive/40 p-3">
              <span className="text-sm">
                Remove {student.display_name}? Their upcoming sessions will be
                canceled. Past service records stay.
              </span>
              <Button
                size="sm"
                variant="destructive"
                disabled={removing}
                onClick={() => void remove()}
              >
                {removing ? "Removing…" : "Yes, remove"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={removing}
                onClick={() => setConfirmingRemove(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="w-fit text-destructive hover:text-destructive"
              onClick={() => setConfirmingRemove(true)}
            >
              Remove from community
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}
