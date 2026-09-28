import type { UserRole } from "@/auth/auth-context";

const ROLE_LABELS: Record<UserRole, string> = {
  PATIENT: "Patient",
  CLINICIAN: "Clinician",
  CLINIC_ADMIN: "Clinic admin",
  PLATFORM_ADMIN: "Platform admin",
};

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}

/** Up to two initials from a name, for avatars. Falls back to "?" for an empty name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
