import type { components } from "@/api/schema";

export type UserOut = components["schemas"]["UserOut"];
export type TokenResponse = components["schemas"]["TokenResponse"];
export type ProblemJson = {
  type: string;
  title: string;
  status: number;
  detail: string;
};

export interface SeedAccount {
  user: UserOut;
  password: string;
}

/** One account per role, so tests and the dev server can exercise role-aware UI. */
export const SEED_ACCOUNTS: readonly SeedAccount[] = [
  {
    password: "password123",
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "patient@aurora.test",
      full_name: "Pat Patient",
      role: "PATIENT",
      is_active: true,
    },
  },
  {
    password: "password123",
    user: {
      id: "22222222-2222-4222-8222-222222222222",
      email: "clinician@aurora.test",
      full_name: "Casey Clinician",
      role: "CLINICIAN",
      is_active: true,
    },
  },
  {
    password: "password123",
    user: {
      id: "33333333-3333-4333-8333-333333333333",
      email: "admin@aurora.test",
      full_name: "Avery Admin",
      role: "PLATFORM_ADMIN",
      is_active: true,
    },
  },
];

export function problem(status: number, title: string, detail: string): ProblemJson {
  return { type: "about:blank", title, status, detail };
}
