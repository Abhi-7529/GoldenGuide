"use client";

import { useActionState } from "react";
import { type ContactState, sendContactMessage } from "~/app/contact/actions";
import { IconCheck } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

const ORGANIZATION_TYPES = [
  "Senior living community",
  "Senior or community center",
  "Library",
  "Bank or credit union",
  "Nonprofit",
  "Healthcare or home care",
  "Other",
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export function ContactForm({ kind }: { kind: "organization" | "general" }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(
    sendContactMessage,
    { status: "idle" },
  );
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  if (state.status === "sent") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-accent p-8 text-center"
      >
        <div className="flex size-14 animate-pop-in items-center justify-center rounded-full bg-primary text-primary-foreground">
          <IconCheck className="size-7" />
        </div>
        <h2 className="text-2xl font-semibold">
          Thank you, your message is on its way
        </h2>
        <p className="text-lg text-muted-foreground">
          A member of the GoldenGuide team will read it and reply to you by
          email.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="kind" value={kind} />
      {/* Hidden from people; catches form-filling bots. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-name">Your name</Label>
          <Input
            id="contact-name"
            name="name"
            defaultValue={values?.name}
            autoComplete="name"
            required
            maxLength={100}
            aria-invalid={!!errors?.name}
          />
          <FieldError message={errors?.name} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            name="email"
            defaultValue={values?.email}
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            aria-invalid={!!errors?.email}
          />
          <FieldError message={errors?.email} />
        </div>
      </div>

      {kind === "organization" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact-org">Organization name</Label>
            <Input
              id="contact-org"
              name="organization"
              defaultValue={values?.organization}
              autoComplete="organization"
              maxLength={150}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact-org-type">Type of organization</Label>
            <Select
              id="contact-org-type"
              name="organization_type"
              defaultValue={values?.organization_type ?? ""}
            >
              <option value="">Choose one…</option>
              {ORGANIZATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-message">
          {kind === "organization"
            ? "How could GoldenGuide help the people you serve?"
            : "Your message"}
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          defaultValue={values?.message}
          required
          rows={6}
          maxLength={4000}
          aria-invalid={!!errors?.message}
        />
        <FieldError message={errors?.message} />
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-base text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" size="xl" disabled={pending} className="sm:w-fit">
        {pending ? "Sending…" : "Send message"}
      </Button>
      <p className="text-sm text-muted-foreground">
        We only use your details to reply to you. See our{" "}
        <a href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
