import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";

import { api } from "../client";
import { unwrap } from "../http";
import { queryKeys } from "../query-keys";
import type { PageParams } from "../query-keys";
import type { AppointmentCreate, AppointmentOut, AppointmentStatus } from "../types";
import type { components } from "../schema";

type AppointmentPage = components["schemas"]["Page_AppointmentOut_"];

const PAGE_SIZE = 20;

/** One appointment plus the strong ETag the server sent, for If-Match on transitions/cancel. */
export interface AppointmentDetail {
  appointment: AppointmentOut;
  etag: string | null;
}

/** Cursor-paginated appointment list (newest first, server-ordered). */
export function useAppointments(
  params: PageParams = {},
): UseInfiniteQueryResult<InfiniteData<AppointmentPage, string | null>, unknown> {
  return useInfiniteQuery({
    queryKey: queryKeys.appointments.list(params),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET("/api/v1/appointments", {
          params: {
            query: {
              limit: params.limit ?? PAGE_SIZE,
              ...(pageParam !== null ? { cursor: pageParam } : {}),
            },
          },
        }),
      ),
    getNextPageParam: (last) =>
      last.page.has_more ? (last.page.next_cursor ?? undefined) : undefined,
  });
}

/** Flatten an appointment infinite query into a single ordered array. */
export function flattenAppointments(
  data: InfiniteData<AppointmentPage, string | null> | undefined,
): AppointmentOut[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}

export function useAppointment(id: string): UseQueryResult<AppointmentDetail, unknown> {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id),
    queryFn: async () => {
      const result = await api.GET("/api/v1/appointments/{appointment_id}", {
        params: { path: { appointment_id: id } },
      });
      const appointment = unwrap(result);
      return { appointment, etag: result.response.headers.get("ETag") };
    },
  });
}

export interface CreateAppointmentVars {
  body: AppointmentCreate;
  /** Client-generated idempotency key, so a retried submit does not double-book. */
  idempotencyKey: string;
  /** Optimistic row to show immediately; replaced by the server's on success. */
  optimistic: AppointmentOut;
}

interface CreateContext {
  previous: [readonly unknown[], InfiniteData<AppointmentPage, string | null> | undefined][];
}

/**
 * Book an appointment with an optimistic insert into every cached appointment list, rolled back
 * if the server rejects it (409 double-booking, 422, network). The Idempotency-Key makes a retry
 * safe end-to-end.
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation<AppointmentOut, unknown, CreateAppointmentVars, CreateContext>({
    mutationFn: async ({ body, idempotencyKey }) =>
      unwrap(
        await api.POST("/api/v1/appointments", {
          body,
          params: { header: { "Idempotency-Key": idempotencyKey } },
        }),
      ),
    onMutate: async ({ optimistic }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });
      const previous = queryClient.getQueriesData<InfiniteData<AppointmentPage, string | null>>({
        queryKey: queryKeys.appointments.all,
      });
      for (const [key, data] of previous) {
        if (data === undefined) continue;
        const [first, ...rest] = data.pages;
        if (first === undefined) continue;
        queryClient.setQueryData(key, {
          ...data,
          pages: [{ ...first, data: [optimistic, ...first.data] }, ...rest],
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    },
  });
}

export interface TransitionVars {
  id: string;
  targetStatus: AppointmentStatus;
  etag: string | null;
}

/** Move an appointment to a new status, guarded by If-Match so a stale view gets a clean 412. */
export function useTransitionAppointment() {
  const queryClient = useQueryClient();
  return useMutation<AppointmentOut, unknown, TransitionVars>({
    mutationFn: async ({ id, targetStatus, etag }) =>
      unwrap(
        await api.POST("/api/v1/appointments/{appointment_id}/transition", {
          params: {
            path: { appointment_id: id },
            header: etag !== null ? { "If-Match": etag } : {},
          },
          body: { target_status: targetStatus },
        }),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData<AppointmentDetail>(
        queryKeys.appointments.detail(updated.id),
        (current) => (current ? { ...current, appointment: updated } : current),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    },
  });
}

export interface CancelVars {
  id: string;
  reason: string | null;
  etag: string | null;
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation<AppointmentOut, unknown, CancelVars>({
    mutationFn: async ({ id, reason, etag }) =>
      unwrap(
        await api.POST("/api/v1/appointments/{appointment_id}/cancel", {
          params: {
            path: { appointment_id: id },
            header: etag !== null ? { "If-Match": etag } : {},
          },
          body: { reason },
        }),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData<AppointmentDetail>(
        queryKeys.appointments.detail(updated.id),
        (current) => (current ? { ...current, appointment: updated } : current),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    },
  });
}
