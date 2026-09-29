import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";

import { api } from "../client";
import { unwrap } from "../http";
import { queryKeys } from "../query-keys";
import type { PageParams } from "../query-keys";
import type {
  ClinicCreate,
  ClinicianCreate,
  ClinicOut,
  ClinicianOut,
  ServiceCreate,
  ServiceOut,
} from "../types";
import type { components } from "../schema";

type ClinicPage = components["schemas"]["Page_ClinicOut_"];
type ClinicianPage = components["schemas"]["Page_ClinicianOut_"];
type ServicePage = components["schemas"]["Page_ServiceOut_"];

const PAGE_SIZE = 50;

function nextCursor(page: { has_more: boolean; next_cursor?: string | null }): string | undefined {
  return page.has_more ? (page.next_cursor ?? undefined) : undefined;
}

// ---- Clinics -------------------------------------------------------------------------------

export function useClinics(
  params: PageParams = {},
): UseInfiniteQueryResult<InfiniteData<ClinicPage, string | null>, unknown> {
  return useInfiniteQuery({
    queryKey: queryKeys.clinics.list(params),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET("/api/v1/clinics", {
          params: {
            query: {
              limit: params.limit ?? PAGE_SIZE,
              ...(pageParam !== null ? { cursor: pageParam } : {}),
            },
          },
        }),
      ),
    getNextPageParam: (last) => nextCursor(last.page),
  });
}

export function flattenClinics(
  data: InfiniteData<ClinicPage, string | null> | undefined,
): ClinicOut[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}

export function useClinic(id: string): UseQueryResult<ClinicOut, unknown> {
  return useQuery({
    queryKey: queryKeys.clinics.detail(id),
    queryFn: async () =>
      unwrap(await api.GET("/api/v1/clinics/{clinic_id}", { params: { path: { clinic_id: id } } })),
  });
}

export function useCreateClinic() {
  const queryClient = useQueryClient();
  return useMutation<ClinicOut, unknown, ClinicCreate>({
    mutationFn: async (body) => unwrap(await api.POST("/api/v1/clinics", { body })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clinics.all });
    },
  });
}

// ---- Clinicians (clinic-scoped) -----------------------------------------------------------

export function useClinicians(
  clinicId: string,
  params: PageParams = {},
): UseInfiniteQueryResult<InfiniteData<ClinicianPage, string | null>, unknown> {
  return useInfiniteQuery({
    queryKey: queryKeys.clinicians.list(clinicId, params),
    enabled: clinicId !== "",
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET("/api/v1/clinicians", {
          params: {
            query: {
              clinic_id: clinicId,
              limit: params.limit ?? PAGE_SIZE,
              ...(pageParam !== null ? { cursor: pageParam } : {}),
            },
          },
        }),
      ),
    getNextPageParam: (last) => nextCursor(last.page),
  });
}

export function flattenClinicians(
  data: InfiniteData<ClinicianPage, string | null> | undefined,
): ClinicianOut[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}

export function useClinician(id: string): UseQueryResult<ClinicianOut, unknown> {
  return useQuery({
    queryKey: queryKeys.clinicians.detail(id),
    enabled: id !== "",
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/clinicians/{clinician_id}", {
          params: { path: { clinician_id: id } },
        }),
      ),
  });
}

export function useCreateClinician(clinicId: string) {
  const queryClient = useQueryClient();
  return useMutation<ClinicianOut, unknown, ClinicianCreate>({
    mutationFn: async (body) => unwrap(await api.POST("/api/v1/clinicians", { body })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clinicians.list(clinicId) });
    },
  });
}

// ---- Services (clinic-scoped) -------------------------------------------------------------

export function useServices(
  clinicId: string,
  params: PageParams = {},
): UseInfiniteQueryResult<InfiniteData<ServicePage, string | null>, unknown> {
  return useInfiniteQuery({
    queryKey: queryKeys.services.list(clinicId, params),
    enabled: clinicId !== "",
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET("/api/v1/services", {
          params: {
            query: {
              clinic_id: clinicId,
              limit: params.limit ?? PAGE_SIZE,
              ...(pageParam !== null ? { cursor: pageParam } : {}),
            },
          },
        }),
      ),
    getNextPageParam: (last) => nextCursor(last.page),
  });
}

export function flattenServices(
  data: InfiniteData<ServicePage, string | null> | undefined,
): ServiceOut[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}

export function useService(id: string): UseQueryResult<ServiceOut, unknown> {
  return useQuery({
    queryKey: queryKeys.services.detail(id),
    enabled: id !== "",
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/services/{service_id}", { params: { path: { service_id: id } } }),
      ),
  });
}

export function useCreateService(clinicId: string) {
  const queryClient = useQueryClient();
  return useMutation<ServiceOut, unknown, ServiceCreate>({
    mutationFn: async (body) => unwrap(await api.POST("/api/v1/services", { body })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services.list(clinicId) });
    },
  });
}
