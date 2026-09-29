import { z } from "zod";

/** Create-form schemas. Kept next to the admin forms; shape mirrors the OpenAPI *Create bodies. */

export const clinicSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  timezone: z.string().min(1, "Timezone is required (IANA, e.g. America/Los_Angeles)"),
  cancellation_cutoff_hours: z.coerce.number().int().min(0, "Must be zero or more"),
});
export type ClinicValues = z.infer<typeof clinicSchema>;

export const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  duration_minutes: z.coerce.number().int().min(5, "At least 5 minutes"),
  price_cents: z.coerce.number().int().min(0, "Must be zero or more"),
  currency: z.string().length(3, "Three-letter code, e.g. USD").toUpperCase(),
  is_active: z.boolean(),
});
export type ServiceValues = z.infer<typeof serviceSchema>;

const timeString = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM");

export const clinicianSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  password: z.string().min(8, "At least 8 characters"),
  specialty: z.string().min(1, "Specialty is required"),
  buffer_minutes: z.coerce.number().int().min(0, "Must be zero or more"),
  weekday: z.coerce.number().int().min(0).max(6),
  work_start: timeString,
  work_end: timeString,
});
export type ClinicianValues = z.infer<typeof clinicianSchema>;
