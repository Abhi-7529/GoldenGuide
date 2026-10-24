"use client";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  MEETING_LINK_HELP,
  MEETING_PROVIDER_LABELS,
  meetingProvider,
} from "~/lib/community";

/** Whether a meeting link field's value can be saved (empty is fine). */
export function meetingLinkOk(value: string) {
  return value.trim() === "" || meetingProvider(value) !== null;
}

/** A meeting link input that says which service it recognized. */
export function MeetingLinkField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const provider = value.trim() ? meetingProvider(value) : null;
  const invalid = value.trim() !== "" && !provider;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex-wrap gap-x-1">
        Meeting link{" "}
        <span className="font-normal text-muted-foreground">
          (optional, you can add it later)
        </span>
      </Label>
      <Input
        id={id}
        type="url"
        inputMode="url"
        value={value}
        maxLength={500}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://zoom.us/j/..."
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-help`}
        autoComplete="off"
      />
      <p
        id={`${id}-help`}
        className={
          invalid ? "text-sm text-destructive" : "text-sm text-muted-foreground"
        }
      >
        {provider
          ? `${MEETING_PROVIDER_LABELS[provider]} link. Only this session's student and learner will see it.`
          : MEETING_LINK_HELP}
      </p>
    </div>
  );
}
