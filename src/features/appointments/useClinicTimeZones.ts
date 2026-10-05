import { useMemo } from "react";

import { flattenClinics, useClinics } from "@/api/hooks";

/**
 * Clinic id -> IANA time zone, so a list of appointments can show each one in its clinic's zone
 * (spec §2), not the viewer's. A clinic not loaded yet maps to `undefined`, which formats in the
 * runtime zone until the clinics arrive.
 */
export function useClinicTimeZones(): Map<string, string> {
  const clinicsQuery = useClinics();
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const clinic of flattenClinics(clinicsQuery.data)) map.set(clinic.id, clinic.timezone);
    return map;
  }, [clinicsQuery.data]);
}
