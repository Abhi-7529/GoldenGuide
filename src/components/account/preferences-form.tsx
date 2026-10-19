"use client";

import { type FormEvent, useState } from "react";
import {
  announceAccountUpdated,
  FormMessage,
} from "~/components/account/account-shell";
import { ReadAloudButton } from "~/components/recipient/read-aloud-button";
import { Button } from "~/components/ui/button";
import {
  applyPreferences,
  type Preferences,
  type ReadAloudRate,
  type TextSize,
} from "~/lib/preferences";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

const TEXT_SIZES: { value: TextSize; label: string; sample: string }[] = [
  { value: "normal", label: "Normal", sample: "text-base" },
  { value: "large", label: "Large", sample: "text-lg" },
  { value: "larger", label: "Extra large", sample: "text-xl" },
];

const RATES: { value: ReadAloudRate; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "slow", label: "Slower" },
];

function Choice({
  checked,
  onChange,
  name,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
        checked
          ? "border-primary bg-accent"
          : "border-border hover:border-primary/50",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-5 accent-[var(--primary)]"
      />
      {children}
    </label>
  );
}

export function PreferencesForm({ initial }: { initial: Preferences }) {
  const [prefs, setPrefs] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  // Show each change straight away, so people can see what it looks like.
  function update(next: Preferences) {
    setPrefs(next);
    setMessage(null);
    applyPreferences(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await createClient().rpc("set_my_preferences", {
      p_text_size: prefs.text_size,
      p_high_contrast: prefs.high_contrast,
      p_read_aloud_rate: prefs.read_aloud_rate,
    });
    setSaving(false);
    if (error) {
      setMessage({
        kind: "error",
        text: "We couldn't save your settings. Please try again.",
      });
      return;
    }
    setSaved(prefs);
    setMessage({
      kind: "success",
      text: "Saved. These settings follow you whenever you sign in.",
    });
    announceAccountUpdated();
  }

  const changed =
    prefs.text_size !== saved.text_size ||
    prefs.high_contrast !== saved.high_contrast ||
    prefs.read_aloud_rate !== saved.read_aloud_rate;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-semibold">Text size</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {TEXT_SIZES.map((size) => (
            <Choice
              key={size.value}
              name="text-size"
              checked={prefs.text_size === size.value}
              onChange={() => update({ ...prefs, text_size: size.value })}
            >
              <span className={cn("font-medium", size.sample)}>
                {size.label}
              </span>
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-semibold">Contrast</legend>
        <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50">
          <input
            type="checkbox"
            checked={prefs.high_contrast}
            onChange={(e) =>
              update({ ...prefs, high_contrast: e.target.checked })
            }
            className="size-5 accent-[var(--primary)]"
          />
          <span className="flex flex-col">
            <span className="text-base font-medium">High contrast</span>
            <span className="text-sm text-muted-foreground">
              Darker text and stronger outlines, easier to read.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-semibold">
          Reading speed for &quot;Listen&quot;
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {RATES.map((rate) => (
            <Choice
              key={rate.value}
              name="read-aloud-rate"
              checked={prefs.read_aloud_rate === rate.value}
              onChange={() => update({ ...prefs, read_aloud_rate: rate.value })}
            >
              <span className="text-base font-medium">{rate.label}</span>
            </Choice>
          ))}
        </div>
        <ReadAloudButton
          text="This is how GoldenGuide sounds when it reads to you."
          label="Try it"
          className="w-fit"
        />
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="xl" disabled={saving || !changed}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
        {changed && (
          <Button
            type="button"
            size="xl"
            variant="outline"
            onClick={() => update(saved)}
          >
            Undo changes
          </Button>
        )}
      </div>
      <FormMessage message={message} />
    </form>
  );
}
