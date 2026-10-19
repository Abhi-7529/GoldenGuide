import type { Metadata } from "next";
import { InquiryList } from "~/components/admin/inquiry-list";
import { Card, CardContent } from "~/components/ui/card";
import { createClient } from "~/lib/supabase/server";
import type { ContactInquiry } from "~/lib/types";

export const metadata: Metadata = { title: "Inquiries" };

export default async function AdminInquiriesPage() {
  const supabase = await createClient();
  // Only admins can read inquiries (RLS); the admin layout checks access too.
  const { data, error } = await supabase
    .from("contact_inquiries")
    .select(
      "id, kind, name, email, organization, organization_type, message, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Inquiries could not be loaded.
        </CardContent>
      </Card>
    );
  }

  return <InquiryList inquiries={(data as ContactInquiry[]) ?? []} />;
}
