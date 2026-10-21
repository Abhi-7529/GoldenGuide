"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { createClient } from "~/lib/supabase/client";

export type StudentProfileFields = {
  display_name: string;
  intro: string;
  availability: string;
  interests: string;
};

export function ProfileForm({ initial }: { initial: StudentProfileFields }) {
  const router = useRouter();
  const [fields, setFields] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof StudentProfileFields>(key: K, value: string) {
    setSaved(false);
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("update_student_profile", {
      p_display_name: fields.display_name,
      p_intro: fields.intro,
      p_availability: fields.availability,
      p_interests: fields.interests,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Name families see</Label>
        <Input
          id="displayName"
          value={fields.display_name}
          maxLength={60}
          onChange={(e) => set("display_name", e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">
          Learners only ever see your first name.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="intro">About you</Label>
        <Textarea
          id="intro"
          value={fields.intro}
          maxLength={600}
          onChange={(e) => set("intro", e.target.value)}
          placeholder="e.g. I'm in 11th grade and I help my grandma with her phone all the time."
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="availability">When you're usually free</Label>
        <Input
          id="availability"
          value={fields.availability}
          maxLength={300}
          onChange={(e) => set("availability", e.target.value)}
          placeholder="e.g. Weekdays after 4pm, Saturday mornings"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="interests" className="flex-wrap gap-x-1">
          Things you'd like to learn{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="interests"
          value={fields.interests}
          maxLength={300}
          onChange={(e) => set("interests", e.target.value)}
          placeholder="e.g. Gardening, family history"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Please don't add your address, phone number, school or other private
        details. Caregivers arrange how to meet.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save profile"}
        </Button>
        {saved && (
          <span
            role="status"
            className="text-sm font-medium text-primary-strong"
          >
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
