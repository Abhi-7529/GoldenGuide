// Who someone is in GoldenGuide, and where their dashboard lives. Every
// "where should this person go?" redirect uses homeForRole so a new role
// only needs adding here.

export type Role = "caregiver" | "care_recipient" | "student";

export const ROLE_LABELS: Record<Role, string> = {
  caregiver: "Caregiver",
  care_recipient: "Learner",
  student: "Student Volunteer",
};

/** The dashboard for a role, or onboarding when there's no profile yet. */
export function homeForRole(role: string | null | undefined) {
  switch (role) {
    case "caregiver":
      return "/caregiver";
    case "care_recipient":
      return "/home";
    case "student":
      return "/student";
    default:
      return "/onboarding";
  }
}
