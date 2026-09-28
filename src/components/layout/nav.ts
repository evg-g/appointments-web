import { CalendarDays, LayoutDashboard, Settings2, Thermometer } from "lucide-react";
import type { ComponentType } from "react";

import type { UserRole } from "@/auth/auth-context";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Roles allowed to see this item. Undefined means every authenticated role. */
  roles?: readonly UserRole[];
  /** Match the route exactly (used for the index route). */
  end?: boolean;
}

const STAFF: readonly UserRole[] = ["CLINICIAN", "CLINIC_ADMIN", "PLATFORM_ADMIN"];
const ADMINS: readonly UserRole[] = ["CLINIC_ADMIN", "PLATFORM_ADMIN"];

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/cold-chain", label: "Cold chain", icon: Thermometer, roles: STAFF },
  { to: "/admin", label: "Admin", icon: Settings2, roles: ADMINS },
];

/** Nav items the given role is allowed to see. */
export function visibleNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles === undefined || item.roles.includes(role));
}
