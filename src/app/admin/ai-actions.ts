"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  type GeneratedLesson,
  generateLesson,
  generatePracticeQuestions,
  generatePracticeScenarios,
  type LessonContext,
} from "~/lib/ai/content";
import { createClient } from "~/lib/supabase/server";
import type { Lesson, PracticeQuestion } from "~/lib/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const GENERATION_ERROR =
  "The AI couldn't finish this request. Please try again in a moment.";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    throw new Error("Not authorized");
  }
  return supabase;
}

const topicSchema = z.string().trim().min(2).max(200);
const instructionsSchema = z.string().trim().max(1000).optional();

const lessonContextSchema = z.object({
  title: z.string().max(300),
  topic: z.string().max(200),
  summary: z.string().max(500),
  body: z.string().max(20000),
  key_takeaways: z.array(z.string().max(500)).max(20),
  practice_questions: z
    .array(
      z.object({
        question: z.string().max(1000),
        choices: z.array(z.string().max(500)).max(8),
        correct_index: z.number().int(),
        explanation: z.string().max(1000),
      }),
    )
    .max(50),
});

/** Generates a lesson for a topic and saves it as an unapproved draft. */
export async function createAiLessonDraft(input: {
  topic: string;
  instructions?: string;
}): Promise<Result<{ id: string }>> {
  const parsed = z
    .object({ topic: topicSchema, instructions: instructionsSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please enter a topic (2–200 characters)." };
  }

  const supabase = await requireAdmin();

  let lesson: GeneratedLesson;
  try {
    lesson = await generateLesson(parsed.data);
  } catch (error) {
    console.error("AI lesson generation failed", error);
    return { ok: false, error: GENERATION_ERROR };
  }

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      title: lesson.title || parsed.data.topic,
      topic: parsed.data.topic,
      summary: lesson.summary,
      body: lesson.body,
      examples: lesson.examples,
      key_takeaways: lesson.key_takeaways,
      practice_questions: lesson.practice_questions,
      ai_review_notes: lesson.review_notes,
      ai_generated: true,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/lessons");
  return { ok: true, data: { id: data.id as string } };
}

/** Generates a fresh version of a lesson. Nothing is saved until the admin saves the form. */
export async function regenerateLesson(input: {
  topic: string;
  instructions?: string;
  current: LessonContext;
}): Promise<Result<GeneratedLesson>> {
  const parsed = z
    .object({
      topic: topicSchema,
      instructions: instructionsSchema,
      current: lessonContextSchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please give the lesson a topic first." };
  }

  await requireAdmin();

  try {
    const lesson = await generateLesson({
      topic: parsed.data.topic,
      instructions: parsed.data.instructions,
      previous: parsed.data.current,
    });
    return { ok: true, data: lesson };
  } catch (error) {
    console.error("AI lesson regeneration failed", error);
    return { ok: false, error: GENERATION_ERROR };
  }
}

/** Generates extra practice questions for a lesson. Nothing is saved until the admin saves the form. */
export async function generateMoreQuestions(input: {
  lesson: LessonContext;
  count: number;
}): Promise<Result<PracticeQuestion[]>> {
  const parsed = z
    .object({
      lesson: lessonContextSchema,
      count: z.number().int().min(1).max(5),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "This lesson needs more content first." };
  }

  await requireAdmin();

  try {
    const questions = await generatePracticeQuestions(
      parsed.data.lesson,
      parsed.data.count,
    );
    if (questions.length === 0) {
      return { ok: false, error: GENERATION_ERROR };
    }
    return { ok: true, data: questions };
  } catch (error) {
    console.error("AI question generation failed", error);
    return { ok: false, error: GENERATION_ERROR };
  }
}

/** Generates practice scenarios from a saved lesson and stores them as unapproved drafts. */
export async function createAiScenarioDrafts(input: {
  lessonId: string;
  count: number;
}): Promise<Result<{ count: number }>> {
  const parsed = z
    .object({
      lessonId: z.string().uuid(),
      count: z.number().int().min(1).max(4),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please choose a lesson." };
  }

  const supabase = await requireAdmin();

  const { data: lessonData } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", parsed.data.lessonId)
    .maybeSingle();

  if (!lessonData) {
    return { ok: false, error: "That lesson no longer exists." };
  }
  const lesson = lessonData as Lesson;

  const { data: existing } = await supabase
    .from("practice_scenarios")
    .select("title");
  const existingTitles = (existing ?? []).map((s) => s.title as string);

  let scenarios: Awaited<ReturnType<typeof generatePracticeScenarios>>;
  try {
    scenarios = await generatePracticeScenarios(
      lesson,
      parsed.data.count,
      existingTitles,
    );
  } catch (error) {
    console.error("AI scenario generation failed", error);
    return { ok: false, error: GENERATION_ERROR };
  }

  if (scenarios.length === 0) {
    return { ok: false, error: GENERATION_ERROR };
  }

  const { error } = await supabase.from("practice_scenarios").insert(
    scenarios.map((s) => ({
      ...s,
      lesson_id: lesson.id,
      ai_generated: true,
      status: "draft",
      sort_order: lesson.sort_order,
    })),
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/scenarios");
  return { ok: true, data: { count: scenarios.length } };
}
