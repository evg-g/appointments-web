import { z } from "zod";

/**
 * Client-side login validation. Mirrors the API's LoginRequest (email format + non-empty
 * password) so the user gets instant feedback, while the server remains the authority. Sharing a
 * Zod schema between form and (later) mock handlers keeps the two from drifting.
 */
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;
