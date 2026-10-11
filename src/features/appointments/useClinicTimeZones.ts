import { useMemo } from "react";

import { flattenClinics, useClinics } from "@/api/hooks";
import type { ClinicOut } from "@/api/types";

/**
 * The clinics a list of appointments needs to show each row in its clinic's zone (spec §2): the
 * loaded clinics, their names and IANA time zones by id, and the state of loading them. The one
 * place a screen loads clinics for that, so loading more of them (e.g. every page) changes here.
 */
export interface ClinicDirectory {
  clinics: ClinicOut[];
  names: Map<string, string>;
  timeZones: Map<string, string>;
  /** Clinics are still loading: zones are not known yet. */
  isPending: boolean;
  /** Clinics failed to load: zones cannot be known until a retry succeeds. */
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  refetch: () => unknown;
}

export function useClinicDirectory(): ClinicDirectory {
  const clinicsQuery = useClinics();
  const clinics = useMemo(() => flattenClinics(clinicsQuery.data), [clinicsQuery.data]);
  const maps = useMemo(() => {
    const names = new Map<string, string>();
    const timeZones = new Map<string, string>();
    for (const clinic of clinics) {
      names.set(clinic.id, clinic.name);
      timeZones.set(clinic.id, clinic.timezone);
    }
    return { names, timeZones };
  }, [clinics]);
  return {
    clinics,
    ...maps,
    isPending: clinicsQuery.isPending,
    isError: clinicsQuery.isError,
    error: clinicsQuery.error,
    isFetching: clinicsQuery.isFetching,
    refetch: clinicsQuery.refetch,
  };
}

/**
 * Clinic id -> IANA time zone, so a list of appointments can show each one in its clinic's zone
 * (spec §2), not the viewer's. A clinic not loaded yet maps to `undefined`, which formats in the
 * runtime zone until the clinics arrive.
 */
export function useClinicTimeZones(): Map<string, string> {
  return useClinicDirectory().timeZones;
}
