import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";

import { api } from "../client";
import { unwrap } from "../http";
import { queryKeys } from "../query-keys";
import type { ExcursionListParams, PageParams, TelemetryParams } from "../query-keys";
import type {
  DeviceCreate,
  DeviceCredentialOut,
  DeviceHealthOut,
  DeviceOut,
  ExcursionOut,
  ThresholdPolicyCreate,
  ThresholdPolicyOut,
  TimeSeriesOut,
} from "../types";
import type { components } from "../schema";

type DevicePage = components["schemas"]["Page_DeviceOut_"];
type ExcursionPage = components["schemas"]["Page_ExcursionOut_"];

const PAGE_SIZE = 50;

function nextCursor(page: { has_more: boolean; next_cursor?: string | null }): string | undefined {
  return page.has_more ? (page.next_cursor ?? undefined) : undefined;
}

// ---- Devices -------------------------------------------------------------------------------

export function useDevices(
  params: PageParams = {},
): UseInfiniteQueryResult<InfiniteData<DevicePage, string | null>, unknown> {
  return useInfiniteQuery({
    queryKey: queryKeys.devices.list(params),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET("/api/v1/devices", {
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

export function flattenDevices(
  data: InfiniteData<DevicePage, string | null> | undefined,
): DeviceOut[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}

export function useDevice(id: string): UseQueryResult<DeviceOut, unknown> {
  return useQuery({
    queryKey: queryKeys.devices.detail(id),
    enabled: id !== "",
    queryFn: async () =>
      unwrap(await api.GET("/api/v1/devices/{device_id}", { params: { path: { device_id: id } } })),
  });
}

export function useDeviceHealth(
  id: string,
  refetchMs?: number,
): UseQueryResult<DeviceHealthOut, unknown> {
  return useQuery({
    queryKey: queryKeys.devices.health(id),
    enabled: id !== "",
    refetchInterval: refetchMs ?? false,
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/devices/{device_id}/health", {
          params: { path: { device_id: id } },
        }),
      ),
  });
}

export function useDeviceTelemetry(
  id: string,
  params: TelemetryParams = {},
): UseQueryResult<TimeSeriesOut, unknown> {
  return useQuery({
    queryKey: queryKeys.devices.telemetry(id, params),
    enabled: id !== "",
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/devices/{device_id}/telemetry", {
          params: {
            path: { device_id: id },
            query: {
              ...(params.bucket !== undefined ? { bucket: String(params.bucket) } : {}),
              ...(params.agg !== undefined ? { agg: params.agg } : {}),
              ...(params.start !== undefined ? { start: params.start } : {}),
              ...(params.end !== undefined ? { end: params.end } : {}),
            },
          },
        }),
      ),
  });
}

export function useDeviceExcursions(
  id: string,
  params: ExcursionListParams = {},
): UseInfiniteQueryResult<InfiniteData<ExcursionPage, string | null>, unknown> {
  return useInfiniteQuery({
    queryKey: queryKeys.devices.excursions(id, params),
    enabled: id !== "",
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET("/api/v1/devices/{device_id}/excursions", {
          params: {
            path: { device_id: id },
            query: {
              ...(params.openOnly !== undefined ? { open_only: params.openOnly } : {}),
              limit: params.limit ?? PAGE_SIZE,
              ...(pageParam !== null ? { cursor: pageParam } : {}),
            },
          },
        }),
      ),
    getNextPageParam: (last) => nextCursor(last.page),
  });
}

export function flattenExcursions(
  data: InfiniteData<ExcursionPage, string | null> | undefined,
): ExcursionOut[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}

export function useExcursion(id: string): UseQueryResult<ExcursionOut, unknown> {
  return useQuery({
    queryKey: queryKeys.excursions.detail(id),
    enabled: id !== "",
    queryFn: async () =>
      unwrap(
        await api.GET("/api/v1/excursions/{excursion_id}", {
          params: { path: { excursion_id: id } },
        }),
      ),
  });
}

// ---- Provisioning ---------------------------------------------------------------------------

export function useProvisionDevice() {
  const queryClient = useQueryClient();
  return useMutation<DeviceCredentialOut, unknown, DeviceCreate>({
    mutationFn: async (body) => unwrap(await api.POST("/api/v1/devices", { body })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices.all });
    },
  });
}

export function useRotateCredential() {
  return useMutation<DeviceCredentialOut, unknown, string>({
    mutationFn: async (deviceId) =>
      unwrap(
        await api.POST("/api/v1/devices/{device_id}/credentials:rotate", {
          params: { path: { device_id: deviceId } },
        }),
      ),
  });
}

// ---- Excursions -----------------------------------------------------------------------------

/** Acknowledge an open excursion; the row's cached acknowledgement flips immediately. */
export function useAcknowledgeExcursion(deviceId: string) {
  const queryClient = useQueryClient();
  return useMutation<ExcursionOut, unknown, string>({
    mutationFn: async (excursionId) =>
      unwrap(
        await api.POST("/api/v1/excursions/{excursion_id}:acknowledge", {
          params: { path: { excursion_id: excursionId } },
        }),
      ),
    onSuccess: () => {
      // Prefix match: sweep every excursion list for this device regardless of its filter params.
      void queryClient.invalidateQueries({ queryKey: ["devices", "excursions", deviceId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices.health(deviceId) });
    },
  });
}

// ---- Threshold policy -----------------------------------------------------------------------

export function useCreateThresholdPolicy() {
  return useMutation<ThresholdPolicyOut, unknown, ThresholdPolicyCreate>({
    mutationFn: async (body) => unwrap(await api.POST("/api/v1/threshold-policies", { body })),
  });
}
