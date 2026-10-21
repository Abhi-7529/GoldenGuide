import { NextResponse } from "next/server";
import { SERVICE_RECORD_DISCLAIMER, VERIFICATION_NOTE } from "~/lib/community";
import { loadServiceRecord } from "~/lib/service-record";
import { createClient } from "~/lib/supabase/server";

/** Quotes a value for CSV, and stops spreadsheets running it as a formula. */
function cell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

// The signed-in student's verified sessions as a spreadsheet. RLS limits the
// rows to their own sessions; the role check keeps other accounts out.
export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role !== "student") {
    return NextResponse.json(
      { error: "Only student volunteers have a service record." },
      { status: 403 },
    );
  }

  const record = await loadServiceRecord(supabase, userId);
  const lines = [
    [
      "Student",
      "Date of service",
      "Minutes",
      "Hours",
      "Topic",
      "What was taught",
      "Confirmed by (caregiver)",
      "Verification date",
      "Status",
    ],
    ...record.rows.map((row) => [
      record.studentName,
      row.date,
      row.minutes,
      (row.minutes / 60).toFixed(2),
      row.topic,
      row.activity,
      row.verifier,
      row.verifiedOn,
      "Verified",
    ]),
    [],
    [
      "Total verified",
      "",
      record.totalMinutes,
      (record.totalMinutes / 60).toFixed(2),
    ],
    [],
    [SERVICE_RECORD_DISCLAIMER],
    [VERIFICATION_NOTE],
  ];
  const csv = lines.map((line) => line.map(cell).join(",")).join("\r\n");
  const today = new Date().toISOString().slice(0, 10);

  // A byte-order mark so Excel reads names with accents correctly.
  return new NextResponse(`﻿${csv}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="goldenguide-service-record-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
