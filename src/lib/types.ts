export type Connection = {
  connection_id: string;
  partner_id: string;
  partner_full_name: string | null;
  partner_role: string;
  created_at: string;
};

export type ContentStatus = "draft" | "published";

export type LessonLevel = "beginner" | "intermediate" | "advanced";

export type LessonExample = {
  title: string;
  description: string;
};

export type PracticeQuestion = {
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string;
};

export type Lesson = {
  id: string;
  title: string;
  topic: string;
  summary: string;
  body: string;
  examples: LessonExample[];
  key_takeaways: string[];
  practice_questions: PracticeQuestion[];
  level: LessonLevel;
  status: ContentStatus;
  sort_order: number;
  ai_generated: boolean;
  ai_review_notes: string[];
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ScenarioChoice = {
  label: string;
  outcome: string;
};

export type Scenario = {
  id: string;
  title: string;
  prompt: string;
  choices: ScenarioChoice[];
  status: ContentStatus;
  sort_order: number;
  lesson_id: string | null;
  ai_generated: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  linked_count: number;
  is_admin_user: boolean;
};

export type AdminOverview = {
  total_users: number;
  learners: number;
  caregivers: number;
  incomplete_signups: number;
  linked_accounts: number;
  admins: number;
  published_lessons: number;
  draft_lessons: number;
  published_scenarios: number;
  draft_scenarios: number;
};

export type AdminUsage = {
  active_7d: number;
  active_30d: number;
  signups_7d: number;
  signups_30d: number;
  messages_total: number;
  messages_7d: number;
  lesson_views_total: number;
  lesson_views_7d: number;
  scenario_attempts_total: number;
  scenario_attempts_7d: number;
  signups_by_day: { day: string; count: number }[];
  top_lessons: { title: string; views: number }[];
  top_scenarios: { title: string; attempts: number }[];
};

export type LessonCompletion = {
  lesson_id: string;
  user_id: string;
  correct_count: number;
  question_count: number;
  completed_at: string;
  lesson_title: string | null;
};

export type PracticeAttempt = {
  user_id: string;
  scenario_id: string;
  created_at: string;
  scenario_title: string | null;
};
