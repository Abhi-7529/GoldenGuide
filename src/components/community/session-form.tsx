"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { PLANNED_MINUTES } from "~/lib/community";
import { createClient } from "~/lib/supabase/client";

type Option = { id: string; name: string };

/** Today's date and time as a datetime-local value, for the input's min. */
function localNow() {
  const now = new Date();
  now.setSeconds(0, 0);
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

/**
 * Plans a session. Caregivers choose the student and learner and can add
 * joining details; students choose from the learners caregivers approved
 * them for, and the caregiver approves the request.
 */
export function SessionForm(
  props:
    | {
        mode: "caregiver";
        students: Option[];
        learners: Option[];
        /** Base path for the new session's page. */
        sessionsPath: string;
      }
    | {
        mode: "student";
        /** Approved learners, grouped by family. */
        families: { caregiverName: string; learners: Option[] }[];
        sessionsPath: string;
      },
) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(
    props.mode === "caregiver" ? (props.students[0]?.id ?? "") : "",
  );
  const [learnerId, setLearnerId] = useState(
    props.mode === "caregiver"
      ? (props.learners[0]?.id ?? "")
      : (props.families[0]?.learners[0]?.id ?? ""),
  );
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [joinDetails, setJoinDetails] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const scheduledAt = new Date(when);
    if (Number.isNaN(scheduledAt.getTime())) {
      setError("Please choose a date and time.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error: rpcError } =
      props.mode === "caregiver"
        ? await supabase.rpc("caregiver_create_session", {
            p_student: studentId,
            p_learner: learnerId,
            p_topic: topic,
            p_description: description,
            p_format: "remote",
            p_join_details: joinDetails,
            p_scheduled_at: scheduledAt.toISOString(),
            p_planned_minutes: PLANNED_MINUTES,
          })
        : await supabase.rpc("student_request_session", {
            p_learner: learnerId,
            p_topic: topic,
            p_description: description,
            p_format: "remote",
            p_scheduled_at: scheduledAt.toISOString(),
            p_planned_minutes: PLANNED_MINUTES,
          });
    if (rpcError || !data) {
      setSaving(false);
      setError(rpcError?.message ?? "Something went wrong. Please try again.");
      return;
    }
    router.push(`${props.sessionsPath}/${data as string}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {props.mode === "caregiver" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="student">Student volunteer</Label>
            <Select
              id="student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            >
              {props.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="learner">Learner</Label>
            <Select
              id="learner"
              value={learnerId}
              onChange={(e) => setLearnerId(e.target.value)}
              required
            >
              {props.learners.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="learner">Who would you like to help?</Label>
          <Select
            id="learner"
            value={learnerId}
            onChange={(e) => setLearnerId(e.target.value)}
            required
          >
            {props.families.map((f) => (
              <optgroup
                key={f.caregiverName}
                label={`${f.caregiverName}'s family`}
              >
                {f.learners.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="topic">What will you learn about?</Label>
        <Input
          id="topic"
          value={topic}
          maxLength={100}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Video calling the grandkids"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description" className="flex-wrap gap-x-1">
          Details{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          maxLength={1000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Anything that would help, like which phone or app."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="when">Date and time</Label>
          <Input
            id="when"
            type="datetime-local"
            value={when}
            min={localNow()}
            onChange={(e) => setWhen(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Length</span>
          <p className="flex h-11 items-center text-base text-muted-foreground">
            {PLANNED_MINUTES} minutes
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Sessions are by video or phone call for now. Plan how to connect, and
        never share home addresses or meet in person.
      </p>

      {props.mode === "caregiver" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="joinDetails" className="flex-wrap gap-x-1">
            How to join{" "}
            <span className="font-normal text-muted-foreground">
              (optional, you can add this later)
            </span>
          </Label>
          <Input
            id="joinDetails"
            value={joinDetails}
            maxLength={500}
            onChange={(e) => setJoinDetails(e.target.value)}
            placeholder="e.g. FaceTime on Mom's iPad, or a video call link"
          />
          <p className="text-sm text-muted-foreground">
            Only the student and learner in this session see this. Don't share
            home addresses, account details or passwords.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={saving} className="w-fit">
        {saving
          ? "Saving..."
          : props.mode === "caregiver"
            ? "Send to student"
            : "Send request"}
      </Button>
      <p className="-mt-2 text-sm text-muted-foreground">
        {props.mode === "caregiver"
          ? "The student will be asked to accept."
          : "The caregiver will be asked to approve it."}
      </p>
    </form>
  );
}
