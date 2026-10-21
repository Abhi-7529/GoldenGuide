import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BackLink } from "~/components/community/session-parts";
import { PrintButton } from "~/components/student/print-button";
import {
  formatHours,
  formatMinutes,
  SERVICE_RECORD_DISCLAIMER,
  VERIFICATION_NOTE,
} from "~/lib/community";
import { loadServiceRecord } from "~/lib/service-record";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Service record" };

export default async function ServiceRecordPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/login");

  const record = await loadServiceRecord(supabase, userId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BackLink href="/student/hours">Back to Volunteer Hours</BackLink>
        <PrintButton />
      </div>

      <article className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-8">
        <header className="flex flex-col gap-1 border-b border-border pb-4">
          <p className="text-sm text-muted-foreground">GoldenGuide</p>
          <h1 className="text-2xl font-bold tracking-tight">
            Community Service Activity Record
          </h1>
          <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Student</dt>
            <dd className="font-medium">{record.studentName}</dd>
            <dt className="text-muted-foreground">Total verified time</dt>
            <dd className="font-medium">
              {formatHours(record.totalMinutes)} across {record.rows.length}{" "}
              {record.rows.length === 1 ? "session" : "sessions"}
            </dd>
            <dt className="text-muted-foreground">Record made on</dt>
            <dd suppressHydrationWarning>{record.generatedOn}</dd>
          </dl>
        </header>

        {record.rows.length === 0 ? (
          <p className="text-muted-foreground">No verified sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Time given</th>
                  <th className="py-2 pr-3 font-medium">Topic</th>
                  <th className="py-2 pr-3 font-medium">What was taught</th>
                  <th className="py-2 pr-3 font-medium">Confirmed by</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {record.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border align-top last:border-0"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap">{row.date}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {formatMinutes(row.minutes)}
                    </td>
                    <td className="py-2 pr-3">{row.topic}</td>
                    <td className="py-2 pr-3">{row.activity}</td>
                    <td className="py-2 pr-3">
                      {row.verifier}
                      <span className="block text-xs text-muted-foreground">
                        Caregiver, on {row.verifiedOn}
                      </span>
                    </td>
                    <td className="py-2">Verified</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <p>{SERVICE_RECORD_DISCLAIMER}</p>
          <p>{VERIFICATION_NOTE}</p>
        </footer>
      </article>
    </div>
  );
}
