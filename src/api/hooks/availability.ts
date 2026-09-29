import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import { api } from "../client";
import { unwrap } from "../http";
import { queryKeys } from "../query-keys";
import type { AvailabilityParams } from "../query-keys";
import type { SlotOut } from "../types";

/**
 * Bookable slots for a clinician + service on one local day (YYYY-MM-DD in the clinic's timezone).
 * The query only runs once all three inputs are chosen, so the booking flow can mount it eagerly.
 */
export function useAvailability(
  params: Partial<AvailabilityParams>,
): UseQueryResult<SlotOut[], unknown> {
  const enabled =
    params.clinicianId !== undefined &&
    params.serviceId !== undefined &&
    params.day !== undefined &&
    params.day !== "";
  return useQuery({
    queryKey: queryKeys.availability.query(params as AvailabilityParams),
    enabled,
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/availability", {
          params: {
            query: {
              clinician_id: params.clinicianId ?? "",
              service_id: params.serviceId ?? "",
              day: params.day ?? "",
            },
          },
        }),
      ),
  });
}
