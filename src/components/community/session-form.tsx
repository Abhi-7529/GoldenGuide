"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  MeetingLinkField,
  meetingLinkOk,
} from "~/components/community/meeting-link-field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import {
  DURATION_OPTIONS,
  FAMILY_MAX_MINUTES,
  formatMinutes,
  MEETING_PROVIDER_LIMITS_NOTE,
  PLANNED_MINUTES,
} from "~/lib/community";
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

/** A length picker, up to the family's limit (the database checks too). */
export function DurationSelect({
  id,
  value,
  maxMinutes,
  onChange,
}: {
  id: string;
  value: number;
  maxMinutes: number;
  onChange: (minutes: number) => void;
}) {
  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {DURATION_OPTIONS.filter((m) => m <= maxMinutes).map((m) => (
        <option key={m} value={m}>
          {formatMinutes(m)}
        </option>
      ))}
    </Select>
  );
}

/**
 * Plans a session. Caregivers choose the student and learner, the length
 * (up to 2 hours on GoldenGuide Family) and the meeting link; students
 * choose from the learners caregivers approved them for, and the caregiver
 * approves the request.
 */
export function SessionForm(
  props:
    | {
        mode: "caregiver";
        students: Option[];
        learners: Option[];
        /** The longest session this caregiver can plan. */
        maxMinutes: number;
        /** Base path for the new session's page. */
        sessionsPath: string;
      }
    | {
        mode: "student";
        /** Approved learners, grouped by family, with each family's limit. */
        families: {
          caregiverName: string;
          maxMinutes: number;
          learners: Option[];
        }[];
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
  const [meetingUrl, setMeetingUrl] = useState("");
  const [minutes, setMinutes] = useState(PLANNED_MINUTES);
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const maxMinutes =
    props.mode === "caregiver"
      ? props.maxMinutes
      : (props.families.find((f) => f.learners.some((l) => l.id === learnerId))
          ?.maxMinutes ?? PLANNED_MINUTES);
  const chosenMinutes = Math.min(minutes, maxMinutes);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const scheduledAt = new Date(when);
    if (Number.isNaN(scheduledAt.getTime())) {
      setError("Please choose a date and time.");
      return;
    }
    if (!meetingLinkOk(meetingUrl)) {
      setError("Please check the meeting link, or leave it empty for now.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error: rpcError } =
      props.mode === "caregiver"
        ? await supabase.rpc("caregiver_plan_session", {
            p_student: studentId,
            p_learner: learnerId,
            p_topic: topic,
            p_description: description,
            p_join_details: joinDetails,
            p_meeting_url: meetingUrl,
            p_scheduled_at: scheduledAt.toISOString(),
            p_planned_minutes: chosenMinutes,
          })
        : await supabase.rpc("student_request_session", {
            p_learner: learnerId,
            p_topic: topic,
            p_description: description,
            p_format: "remote",
            p_scheduled_at: scheduledAt.toISOString(),
            p_planned_minutes: chosenMinutes,
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
          <p className="text-sm text-muted-foreground">
            In your own time zone.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="length">Length</Label>
          <DurationSelect
            id="length"
            value={chosenMinutes}
            maxMinutes={maxMinutes}
            onChange={setMinutes}
          />
          {props.mode === "caregiver" && maxMinutes < FAMILY_MAX_MINUTES && (
            <p className="text-sm text-muted-foreground">
              Up to 30 minutes on the Free plan.{" "}
              <Link
                href="/caregiver/membership"
                className="font-medium text-primary-strong underline-offset-4 hover:underline"
              >
                GoldenGuide Family allows up to 2 hours.
              </Link>
            </p>
          )}
        </div>
      </div>

      {props.mode === "caregiver" && (
        <>
          <MeetingLinkField
            id="meetingUrl"
            value={meetingUrl}
            onChange={setMeetingUrl}
          />
          {chosenMinutes > 40 && (
            <p className="text-sm text-muted-foreground">
              {MEETING_PROVIDER_LIMITS_NOTE}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="joinDetails" className="flex-wrap gap-x-1">
              Joining notes{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="joinDetails"
              value={joinDetails}
              maxLength={500}
              onChange={(e) => setJoinDetails(e.target.value)}
              placeholder="e.g. Use Mom's iPad; the passcode is in the invite"
            />
            <p className="text-sm text-muted-foreground">
              Only the student and learner in this session see these. Don't
              share home addresses, account details or passwords.
            </p>
          </div>
        </>
      )}

      <p className="text-sm text-muted-foreground">
        Sessions happen by video or phone call. GoldenGuide doesn't host or
        record calls; the meeting opens in its own app or tab.
      </p>

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
          ? "The student will be asked to accept, including the length."
          : "The caregiver will be asked to approve it, including the length."}
      </p>
    </form>
  );
}
