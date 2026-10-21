// Test accounts for trying the Community Skill Exchange locally. Dev
// database only: it refuses to run against any other Supabase project.
//
// Recreates (from scratch, every run):
//   community-caregiver@example.com  caregiver "Carol Tester"
//   community-learner@example.com    learner "Leo Tester", connected to Carol
//   community-student@example.com    signed up, not set up yet (gets the
//                                    student role by redeeming a code)
// then prints a fresh student invitation code from Carol.
//
// With --with-student, Sky Student also redeems that code (so the student
// account is fully set up) and Carol lets Sky help Leo, ready for sessions.
//
// All three use COMMUNITY_TEST_PASSWORD from .env.local.
// Run with: pnpm community:seed [--with-student]

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const DEV_PROJECT_REF = "rhydgtkqvswkhvvhoatq";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const password = process.env.COMMUNITY_TEST_PASSWORD ?? "";

const USERS = {
  caregiver: "community-caregiver@example.com",
  learner: "community-learner@example.com",
  student: "community-student@example.com",
};

async function main() {
  if (!url.includes(DEV_PROJECT_REF)) {
    throw new Error(
      "Refusing to run: .env.local doesn't point at the dev project.",
    );
  }
  if (password.length < 12) {
    throw new Error(
      "Set COMMUNITY_TEST_PASSWORD (12+ characters) in .env.local.",
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // Start clean: deleting a user cascades to their profile and community data.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (listError) throw listError;
  const emails = new Set(Object.values(USERS));
  for (const user of list.users) {
    if (user.email && emails.has(user.email)) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw error;
    }
  }

  const ids: Record<string, string> = {};
  for (const [key, email] of Object.entries(USERS)) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    ids[key] = data.user.id;
  }

  const { error: profileError } = await admin.from("profiles").insert([
    { id: ids.caregiver, role: "caregiver", full_name: "Carol Tester" },
    { id: ids.learner, role: "care_recipient", full_name: "Leo Tester" },
  ]);
  if (profileError) throw profileError;

  const { error: connectionError } = await admin
    .from("connections")
    .insert({ caregiver_id: ids.caregiver, care_recipient_id: ids.learner });
  if (connectionError) throw connectionError;

  // Codes can only be made by the caregiver themself.
  const carol = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const { error: signInError } = await carol.auth.signInWithPassword({
    email: USERS.caregiver,
    password,
  });
  if (signInError) throw signInError;
  const { data: invite, error: inviteError } = await carol
    .rpc("create_student_invitation", { p_label: "Seed script" })
    .single();
  if (inviteError) throw inviteError;
  const code = (invite as { code: string }).code;

  if (process.argv.includes("--with-student")) {
    const sky = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const { error: skySignInError } = await sky.auth.signInWithPassword({
      email: USERS.student,
      password,
    });
    if (skySignInError) throw skySignInError;
    const { data: redeemed, error: redeemError } = await sky.rpc(
      "redeem_student_invitation",
      {
        p_code: code,
        p_display_name: "Sky Student",
        p_age_group: "18_plus",
        p_time_zone: "America/Chicago",
      },
    );
    if (redeemError) throw redeemError;
    if (!(redeemed as { ok: boolean }).ok) {
      throw new Error(JSON.stringify(redeemed));
    }
    const { error: accessError } = await carol.rpc(
      "set_student_learner_access",
      { p_student: ids.student, p_learner: ids.learner, p_allowed: true },
    );
    if (accessError) throw accessError;
    console.log("Sky is a student in Carol's community and can help Leo.");
  } else {
    console.log(`Student invitation code from Carol: ${code}`);
  }

  console.log("Test accounts ready (password: COMMUNITY_TEST_PASSWORD).");
  for (const [key, email] of Object.entries(USERS)) {
    console.log(`  ${key.padEnd(9)} ${email}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
