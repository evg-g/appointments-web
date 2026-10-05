/**
 * Central query-key factory. One place owns every key shape, so invalidation and optimistic
 * cache edits target exactly the right entries and never drift from the query definitions.
 *
 * Keys are plain, serialisable tuples; the leading segment namespaces a domain so a coarse
 * `queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })` sweeps a whole area.
 */

export interface PageParams {
  limit?: number;
  cursor?: string | null;
}

export interface AvailabilityParams {
  clinicianId: string;
  serviceId: string;
  day: string; // YYYY-MM-DD
}

export interface TelemetryParams {
  bucket?: number;
  agg?: "avg" | "min" | "max";
  start?: string;
  end?: string;
}

export interface ExcursionListParams extends PageParams {
  openOnly?: boolean;
}

export interface AuditListParams extends PageParams {
  action?: string;
  actorId?: string;
  entityType?: string;
}

export const queryKeys = {
  appointments: {
    all: ["appointments"] as const,
    /** Prefix of every paginated appointment list (not the single-appointment detail queries). */
    lists: ["appointments", "list"] as const,
    list: (params: PageParams = {}) => ["appointments", "list", params] as const,
    detail: (id: string) => ["appointments", "detail", id] as const,
  },
  availability: {
    all: ["availability"] as const,
    query: (params: AvailabilityParams) => ["availability", params] as const,
  },
  clinics: {
    all: ["clinics"] as const,
    list: (params: PageParams = {}) => ["clinics", "list", params] as const,
    detail: (id: string) => ["clinics", "detail", id] as const,
  },
  clinicians: {
    all: ["clinicians"] as const,
    list: (clinicId: string, params: PageParams = {}) =>
      ["clinicians", "list", clinicId, params] as const,
    detail: (id: string) => ["clinicians", "detail", id] as const,
  },
  services: {
    all: ["services"] as const,
    list: (clinicId: string, params: PageParams = {}) =>
      ["services", "list", clinicId, params] as const,
    detail: (id: string) => ["services", "detail", id] as const,
  },
  users: {
    all: ["users"] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
  devices: {
    all: ["devices"] as const,
    list: (params: PageParams = {}) => ["devices", "list", params] as const,
    detail: (id: string) => ["devices", "detail", id] as const,
    health: (id: string) => ["devices", "health", id] as const,
    telemetry: (id: string, params: TelemetryParams = {}) =>
      ["devices", "telemetry", id, params] as const,
    excursions: (id: string, params: ExcursionListParams = {}) =>
      ["devices", "excursions", id, params] as const,
  },
  excursions: {
    all: ["excursions"] as const,
    detail: (id: string) => ["excursions", "detail", id] as const,
  },
  audit: {
    all: ["audit"] as const,
    list: (params: AuditListParams = {}) => ["audit", "list", params] as const,
  },
} as const;
