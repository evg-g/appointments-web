import { Radio, Thermometer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { flattenDevices, useDevices, useDeviceTelemetry } from "@/api/hooks";
import { useTelemetryStream } from "@/api/sse";
import type { DeviceOut } from "@/api/types";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  QueryBoundary,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatTemperature } from "@/lib/units";

import { DeviceHealthTile } from "./DeviceHealthTile";
import { ExcursionTimeline } from "./ExcursionTimeline";
import { TemperatureChart } from "./TemperatureChart";
import type { ChartPoint } from "./TemperatureChart";
import { ThresholdEditor } from "./ThresholdEditor";

export function ColdChainDashboard() {
  const devicesQuery = useDevices();
  const devices = flattenDevices(devicesQuery.data);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (selectedId === "" && devices.length > 0 && devices[0] !== undefined) {
      setSelectedId(devices[0].id);
    }
  }, [devices, selectedId]);

  const selected = devices.find((device) => device.id === selectedId);

  return (
    <>
      <PageHeader
        title="Cold chain"
        description="Live medication-fridge monitoring across your clinics."
      />

      <QueryBoundary
        query={{
          isPending: devicesQuery.isPending,
          isError: devicesQuery.isError,
          error: devicesQuery.error,
          data: devices,
          isFetching: devicesQuery.isFetching,
          refetch: devicesQuery.refetch,
        }}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            icon={Thermometer}
            title="No devices"
            description="No cold-chain sensors are registered yet."
          />
        }
      >
        {(rows) => (
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <nav className="flex flex-col gap-2" aria-label="Devices">
              {rows.map((device: DeviceOut) => (
                <button
                  key={device.id}
                  type="button"
                  aria-current={device.id === selectedId}
                  onClick={() => setSelectedId(device.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm",
                    device.id === selectedId
                      ? "border-accent bg-accent-subtle"
                      : "border-line bg-surface hover:border-accent",
                  )}
                >
                  <span className="block font-medium text-fg">{device.location_label}</span>
                  <span className="block text-xs text-muted">{device.status.toLowerCase()}</span>
                </button>
              ))}
            </nav>

            {selected !== undefined ? (
              <DevicePanel device={selected} />
            ) : (
              <EmptyState
                title="Select a device"
                description="Pick a device to see its readings."
              />
            )}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}

function DevicePanel({ device }: { device: DeviceOut }) {
  const [band, setBand] = useState<{ min: number; max: number } | undefined>({ min: 2, max: 8 });
  const telemetryQuery = useDeviceTelemetry(device.id, { bucket: 300, agg: "avg" });
  const stream = useTelemetryStream({ deviceId: device.id, enabled: true });

  const points: ChartPoint[] = useMemo(() => {
    const historical: ChartPoint[] = (telemetryQuery.data?.points ?? []).map((point) => ({
      t: new Date(point.bucket_start).getTime(),
      v: point.value,
    }));
    const live: ChartPoint[] = stream.points
      .filter((point) => point.temperatureC !== null && point.measuredAt !== null)
      .map((point) => ({
        t: new Date(point.measuredAt as string).getTime(),
        v: point.temperatureC as number,
      }));
    const merged = [...historical, ...live].sort((a, b) => a.t - b.t);
    // De-duplicate identical timestamps, keeping the latest value.
    const byTime = new Map<number, number>();
    for (const point of merged) byTime.set(point.t, point.v);
    return [...byTime.entries()].map(([t, v]) => ({ t, v })).sort((a, b) => a.t - b.t);
  }, [telemetryQuery.data, stream.points]);

  const latest = points.at(-1)?.v ?? null;
  const streamBadge =
    stream.status === "open"
      ? { variant: "success" as const, label: "Live" }
      : stream.status === "connecting"
        ? { variant: "info" as const, label: "Connecting" }
        : stream.status === "error"
          ? { variant: "warning" as const, label: "Reconnecting" }
          : { variant: "neutral" as const, label: "Idle" };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Temperature</CardTitle>
            <Badge variant={streamBadge.variant}>
              <Radio className="mr-1 inline size-3" aria-hidden="true" />
              {streamBadge.label}
            </Badge>
          </CardHeader>
          <CardContent>
            <QueryBoundary
              query={{
                isPending: telemetryQuery.isPending,
                isError: telemetryQuery.isError,
                error: telemetryQuery.error,
                data: points,
                isFetching: telemetryQuery.isFetching,
                refetch: telemetryQuery.refetch,
              }}
              isEmpty={(rows) => rows.length === 0}
              empty={
                <EmptyState
                  title="No readings yet"
                  description="This device has not reported data."
                />
              }
            >
              {(rows) => (
                <div className="flex flex-col gap-2">
                  <p className="text-3xl font-semibold tabular-nums text-fg">
                    {formatTemperature(latest)}
                  </p>
                  <TemperatureChart
                    points={rows}
                    band={band}
                    ariaSummary={`Temperature for ${device.location_label}. Latest ${formatTemperature(latest)}.`}
                  />
                </div>
              )}
            </QueryBoundary>
          </CardContent>
        </Card>

        <DeviceHealthTile device={device} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Threshold policy</CardTitle>
        </CardHeader>
        <CardContent>
          <ThresholdEditor deviceId={device.id} onBandChange={setBand} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Excursions</CardTitle>
        </CardHeader>
        <CardContent>
          <ExcursionTimeline deviceId={device.id} />
        </CardContent>
      </Card>
    </div>
  );
}
