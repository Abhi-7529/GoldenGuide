// AI content generation for GoldenGuide lessons and practice scenarios.
// Runs through Vercel AI Gateway; the AI SDK reads AI_GATEWAY_API_KEY, which
// src/env.ts validates at startup. Only import this from server code.

import { generateText, Output } from "ai";
import { z } from "zod";
import type {
  LessonExample,
  PracticeQuestion,
  ScenarioChoice,
} from "~/lib/types";

// Free-tier model on the current AI Gateway plan.
const MODEL = "openai/gpt-5.4-nano";

const SYSTEM_PROMPT = `You write financial education content for GoldenGuide, a learning app for older adults (generally 60+) who want to feel more confident managing money.

Audience and style:
- Many readers are older adults who may have trouble with long or complicated text. Make everything very easy to read.
- Write at about a 5th-grade reading level. Keep most sentences under 15 words. Use common, everyday words.
- Talk directly to the reader as "you". Be warm and respectful. Never be condescending.
- Keep paragraphs to two or three short sentences, one idea each.
- Avoid financial jargon. If you must use a term, explain it right away in plain words.
- Use realistic, everyday examples that fit older adults' lives (fixed incomes, retirement, Medicare, grandchildren, home repairs, phone and email scams).
- Use round, illustrative numbers and say they are examples.
- Practice questions must be short and direct. Use three answer choices. Never use trick questions, double negatives, "NOT" questions, or "all of the above".

Safety rules (these always apply):
- Content is general education only. Never give personalized financial, investment, tax, legal, or insurance advice.
- Never tell the reader what they personally should buy, sell, invest in, or sign up for. Never recommend specific stocks, funds, cryptocurrencies, companies, or financial products by name.
- Never promise returns or suggest that any investment is safe, guaranteed, or a sure thing.
- When a decision depends on someone's own situation, say so and suggest talking with a trusted family member or a qualified, licensed professional (for example a fee-only financial planner, an accountant, or their bank).
- If the requested topic asks for personal advice (for example "which stocks should I buy"), turn it into a general educational lesson on the underlying idea instead (for example "how to think about choosing investments").
- Rules and figures that change over time or vary by state (tax limits, Social Security or Medicare amounts) must be described generally. Do not state a specific current figure as fact.
- Do not include links, phone numbers, or email addresses.`;

const questionSchema = z.object({
  question: z.string().describe("A clear multiple-choice question."),
  choices: z
    .array(z.string())
    .describe("Exactly three short answer choices. Exactly one is correct."),
  correctIndex: z
    .number()
    .int()
    .describe("Zero-based index of the correct choice in choices."),
  explanation: z
    .string()
    .describe(
      "One short, kind sentence explaining why the correct answer is right.",
    ),
});

const lessonSchema = z.object({
  title: z.string().describe("A short, friendly lesson title."),
  summary: z
    .string()
    .describe("One sentence shown on the lesson card, under 120 characters."),
  explanation: z
    .array(z.string())
    .describe(
      "Three to five short paragraphs (two or three short sentences each) that teach the topic step by step.",
    ),
  examples: z
    .array(
      z.object({
        title: z.string().describe("A short label for the example."),
        description: z
          .string()
          .describe(
            "Two or three short sentences walking through a realistic case.",
          ),
      }),
    )
    .describe("Two realistic examples."),
  keyTakeaways: z
    .array(z.string())
    .describe("Three or four short, one-sentence key takeaways."),
  practiceQuestions: z
    .array(questionSchema)
    .describe("Three practice questions about the lesson."),
  reviewNotes: z
    .array(z.string())
    .describe(
      "Short notes for the human reviewer: anything worth double-checking, such as facts that change yearly or vary by state. Empty if nothing stands out.",
    ),
});

const scenarioSchema = z.object({
  title: z.string().describe("A short scenario title."),
  prompt: z
    .string()
    .describe(
      "Two or three short sentences describing a realistic money decision the reader faces.",
    ),
  choices: z
    .array(
      z.object({
        label: z.string().describe("A short action the reader could take."),
        outcome: z
          .string()
          .describe(
            "One or two balanced sentences on what could happen, including trade-offs. Do not judge the reader.",
          ),
      }),
    )
    .describe("Three reasonable choices."),
});

export type GeneratedLesson = {
  title: string;
  summary: string;
  body: string;
  examples: LessonExample[];
  key_takeaways: string[];
  practice_questions: PracticeQuestion[];
  review_notes: string[];
};

export type GeneratedScenario = {
  title: string;
  prompt: string;
  choices: ScenarioChoice[];
};

export type LessonContext = {
  title: string;
  topic: string;
  summary: string;
  body: string;
  key_takeaways: string[];
  practice_questions: PracticeQuestion[];
};

function clean(text: string) {
  return text.trim();
}

function normalizeQuestions(
  questions: z.infer<typeof questionSchema>[],
): PracticeQuestion[] {
  return questions
    .map((q) => ({
      question: clean(q.question),
      choices: q.choices.map(clean).filter(Boolean),
      correct_index: q.correctIndex,
      explanation: clean(q.explanation),
    }))
    .filter(
      (q) =>
        q.question &&
        q.choices.length >= 2 &&
        q.correct_index >= 0 &&
        q.correct_index < q.choices.length,
    );
}

function describeLesson(lesson: LessonContext) {
  return [
    `Title: ${lesson.title}`,
    `Topic: ${lesson.topic}`,
    lesson.summary && `Summary: ${lesson.summary}`,
    lesson.body && `Lesson content:\n${lesson.body}`,
    lesson.key_takeaways.length > 0 &&
      `Key takeaways:\n${lesson.key_takeaways.map((t) => `- ${t}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateLesson({
  topic,
  instructions,
  previous,
}: {
  topic: string;
  instructions?: string;
  previous?: LessonContext;
}): Promise<GeneratedLesson> {
  const prompt = [
    `Write a complete, simple lesson on this financial topic: ${topic}`,
    previous &&
      `Here is the previous draft. Write a fresh, improved version rather than copying it.\n\n${describeLesson(previous)}`,
    instructions && `Notes from the reviewer to follow:\n${instructions}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { output } = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt,
    output: Output.object({ schema: lessonSchema, name: "lesson" }),
  });

  return {
    title: clean(output.title),
    summary: clean(output.summary),
    body: output.explanation.map(clean).filter(Boolean).join("\n\n"),
    examples: output.examples
      .map((e) => ({
        title: clean(e.title),
        description: clean(e.description),
      }))
      .filter((e) => e.title && e.description),
    key_takeaways: output.keyTakeaways.map(clean).filter(Boolean),
    practice_questions: normalizeQuestions(output.practiceQuestions),
    review_notes: output.reviewNotes.map(clean).filter(Boolean),
  };
}

export async function generatePracticeQuestions(
  lesson: LessonContext,
  count: number,
): Promise<PracticeQuestion[]> {
  const existing = lesson.practice_questions.map((q) => `- ${q.question}`);

  const { output } = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt: [
      `Write ${count} new multiple-choice practice questions based only on this lesson.`,
      describeLesson(lesson),
      existing.length > 0 &&
        `Do not repeat or closely rephrase these existing questions:\n${existing.join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    output: Output.object({
      schema: z.object({ questions: z.array(questionSchema) }),
      name: "practice_questions",
    }),
  });

  return normalizeQuestions(output.questions).slice(0, count);
}

export async function generatePracticeScenarios(
  lesson: LessonContext,
  count: number,
  existingTitles: string[],
): Promise<GeneratedScenario[]> {
  const { output } = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt: [
      `Write ${count} practice scenarios based on this lesson. Each scenario puts the reader in a realistic everyday money decision and shows the trade-offs of each choice. There is no single "right" answer; outcomes should be balanced and educational.`,
      describeLesson(lesson),
      existingTitles.length > 0 &&
        `These scenarios already exist, so cover different situations:\n${existingTitles.map((t) => `- ${t}`).join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    output: Output.object({
      schema: z.object({ scenarios: z.array(scenarioSchema) }),
      name: "practice_scenarios",
    }),
  });

  return output.scenarios
    .map((s) => ({
      title: clean(s.title),
      prompt: clean(s.prompt),
      choices: s.choices
        .map((c) => ({ label: clean(c.label), outcome: clean(c.outcome) }))
        .filter((c) => c.label && c.outcome),
    }))
    .filter((s) => s.title && s.prompt && s.choices.length >= 2)
    .slice(0, count);
}
