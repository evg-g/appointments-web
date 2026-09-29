import { useInfiniteQuery } from "@tanstack/react-query";
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";

import { api } from "../client";
import { unwrap } from "../http";
import { queryKeys } from "../query-keys";
import type { AuditListParams } from "../query-keys";
import type { AuditLogEntryOut } from "../types";
import type { components } from "../schema";

type AuditPage = components["schemas"]["Page_AuditLogEntryOut_"];

const PAGE_SIZE = 25;

/** Admin-only audit log, cursor-paginated with optional action/entity/actor filters. */
export function useAuditLog(
  params: AuditListParams = {},
): UseInfiniteQueryResult<InfiniteData<AuditPage, string | null>, unknown> {
  return useInfiniteQuery({
    queryKey: queryKeys.audit.list(params),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET("/api/v1/audit-log", {
          params: {
            query: {
              limit: params.limit ?? PAGE_SIZE,
              ...(params.action !== undefined && params.action !== ""
                ? { action: params.action }
                : {}),
              ...(params.entityType !== undefined && params.entityType !== ""
                ? { entity_type: params.entityType }
                : {}),
              ...(params.actorId !== undefined && params.actorId !== ""
                ? { actor_id: params.actorId }
                : {}),
              ...(pageParam !== null ? { cursor: pageParam } : {}),
            },
          },
        }),
      ),
    getNextPageParam: (last) =>
      last.page.has_more ? (last.page.next_cursor ?? undefined) : undefined,
  });
}

export function flattenAuditLog(
  data: InfiniteData<AuditPage, string | null> | undefined,
): AuditLogEntryOut[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}
