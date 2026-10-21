"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { IconPlus } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import {
  SKILL_CATEGORIES,
  type SkillCategory,
  type StudentSkill,
} from "~/lib/community";
import { createClient } from "~/lib/supabase/client";

type Draft = { category: SkillCategory; title: string; description: string };

const EMPTY: Draft = { category: "technology", title: "", description: "" };

function SkillFields({
  idPrefix,
  draft,
  onChange,
}: {
  idPrefix: string;
  draft: Draft;
  onChange: (draft: Draft) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-category`}>Kind of skill</Label>
        <Select
          id={`${idPrefix}-category`}
          value={draft.category}
          onChange={(e) =>
            onChange({ ...draft, category: e.target.value as SkillCategory })
          }
        >
          {(Object.keys(SKILL_CATEGORIES) as SkillCategory[]).map((key) => (
            <option key={key} value={key}>
              {SKILL_CATEGORIES[key]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-title`}>What you can teach</Label>
        <Input
          id={`${idPrefix}-title`}
          value={draft.title}
          maxLength={80}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="e.g. Video calls on a phone or tablet"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label
          htmlFor={`${idPrefix}-description`}
          className="flex-wrap gap-x-1"
        >
          A little more{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-description`}
          value={draft.description}
          maxLength={300}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          placeholder="e.g. FaceTime, Zoom and WhatsApp"
        />
      </div>
    </div>
  );
}

export function SkillsManager({
  studentId,
  skills,
}: {
  studentId: string;
  skills: StudentSkill[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clean(d: Draft) {
    return {
      category: d.category,
      title: d.title.trim(),
      description: d.description.trim(),
    };
  }

  async function run(
    work: () => PromiseLike<{ error: { message: string } | null }>,
  ) {
    setError(null);
    setBusy(true);
    const { error: dbError } = await work();
    setBusy(false);
    if (dbError) {
      setError(dbError.message);
      return false;
    }
    router.refresh();
    return true;
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const ok = await run(() =>
      supabase
        .from("student_skills")
        .insert({ student_id: studentId, ...clean(draft) }),
    );
    if (ok) setDraft(EMPTY);
  }

  async function save(id: string) {
    const supabase = createClient();
    const ok = await run(() =>
      supabase.from("student_skills").update(clean(editDraft)).eq("id", id),
    );
    if (ok) setEditingId(null);
  }

  async function remove(id: string) {
    const supabase = createClient();
    const ok = await run(() =>
      supabase.from("student_skills").delete().eq("id", id),
    );
    if (ok) setConfirmingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="py-6">
          <form onSubmit={add} className="flex flex-col gap-4">
            <h2 className="font-semibold">Add a skill</h2>
            <SkillFields idPrefix="new" draft={draft} onChange={setDraft} />
            <Button
              type="submit"
              disabled={busy || !draft.title.trim() || skills.length >= 20}
              className="w-fit"
            >
              <IconPlus />
              Add skill
            </Button>
            {skills.length >= 20 && (
              <p className="text-sm text-muted-foreground">
                You can list up to 20 skills.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Your skills ({skills.length})
        </h2>
        {skills.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No skills yet. Caregivers see these when deciding who could help.
            </CardContent>
          </Card>
        ) : (
          skills.map((skill) => (
            <Card key={skill.id}>
              <CardContent className="flex flex-col gap-3 py-4">
                {editingId === skill.id ? (
                  <>
                    <SkillFields
                      idPrefix={skill.id}
                      draft={editDraft}
                      onChange={setEditDraft}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busy || !editDraft.title.trim()}
                        onClick={() => void save(skill.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                      >
                        Never mind
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium">{skill.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {SKILL_CATEGORIES[skill.category] ?? "Other"}
                        {skill.description && ` · ${skill.description}`}
                      </span>
                    </div>
                    {confirmingId === skill.id ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm">Remove this skill?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => void remove(skill.id)}
                        >
                          Yes, remove
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setConfirmingId(null)}
                        >
                          Cancel
                        </Button>
                      </span>
                    ) : (
                      <span className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(skill.id);
                            setEditDraft({
                              category: skill.category,
                              title: skill.title,
                              description: skill.description,
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmingId(skill.id)}
                        >
                          Remove
                        </Button>
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
