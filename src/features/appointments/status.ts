import type { AppointmentStatus } from "@/api/types";
import type { BadgeVariant } from "@/components/ui";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

export const STATUS_VARIANT: Record<AppointmentStatus, BadgeVariant> = {
  REQUESTED: "info",
  CONFIRMED: "accent",
  COMPLETED: "success",
  CANCELLED: "neutral",
  NO_SHOW: "warning",
};

/**
 * Forward transitions offered on the detail page (via the transition endpoint). Cancellation is a
 * separate endpoint with its own reason + cancellation-window rules, so CANCELLED is not listed
 * here — `canCancel` governs that button instead.
 */
export const TRANSITION_TARGETS: Record<AppointmentStatus, AppointmentStatus[]> = {
  REQUESTED: ["CONFIRMED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canCancel(status: AppointmentStatus): boolean {
  return status === "REQUESTED" || status === "CONFIRMED";
}

export function isTerminal(status: AppointmentStatus): boolean {
  return status === "COMPLETED" || status === "CANCELLED" || status === "NO_SHOW";
}
