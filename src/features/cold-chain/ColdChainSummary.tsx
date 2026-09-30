import { AlertTriangle, Thermometer } from "lucide-react";
import { Link } from "react-router-dom";

import { flattenDevices, useDeviceHealth, useDevices } from "@/api/hooks";
import type { DeviceOut } from "@/api/types";
import { Badge, Button, EmptyState, QueryBoundary, Skeleton, Spinner } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { formatTemperature } from "@/lib/units";

/** How many devices the dashboard card lists before pointing to the full cold-chain page. */
const MAX_DEVICES = 6;

/**
 * The dashboard's cold-chain card: one line per fridge sensor with its latest temperature and
 * whether it has an open excursion. The full chart, timeline, and acknowledgement live on
 * /cold-chain; this only answers "is anything wrong right now?".
 */
export function ColdChainSummary() {
  const devicesQuery = useDevices({ limit: MAX_DEVICES });
  const devices = flattenDevices(devicesQuery.data);

  return (
    <QueryBoundary
      query={{
        isPending: devicesQuery.isPending,
        isError: devicesQuery.isError,
        error: devicesQuery.error,
        data: devices,
        isFetching: devicesQuery.isFetching,
        refetch: devicesQuery.refetch,
      }}
      loading={<Spinner label="Loading devices" />}
      isEmpty={(rows) => rows.length === 0}
      empty={
        <EmptyState
          icon={Thermometer}
          title="No fridge sensors yet"
          description="Registered sensors will show their temperature here."
          action={
            <Button asChild size="sm" variant="secondary">
              <Link to="/cold-chain">Open cold chain</Link>
            </Button>
          }
        />
      }
    >
      {(rows) => (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y divide-line" aria-label="Fridge sensors">
            {rows.map((device) => (
              <DeviceSummaryRow key={device.id} device={device} />
            ))}
          </ul>
          <div>
            <Button asChild size="sm" variant="secondary">
              <Link to="/cold-chain">Open cold chain</Link>
            </Button>
          </div>
        </div>
      )}
    </QueryBoundary>
  );
}

function DeviceSummaryRow({ device }: { device: DeviceOut }) {
  const health = useDeviceHealth(device.id, 30_000);
  const status = rowStatus(device, health.data?.open_excursions);

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0 truncate text-sm font-medium text-fg">{device.location_label}</span>
      <span className="flex shrink-0 items-center gap-3">
        {health.isPending ? (
          <Skeleton className="h-5 w-24" />
        ) : health.isError ? (
          <span className="text-sm text-danger-fg">Health unavailable</span>
        ) : (
          <>
            <span className="text-sm tabular-nums text-fg">
              {formatTemperature(health.data.last_temperature_c)}
            </span>
            <Badge variant={status.variant} className="gap-1">
              {status.variant === "warning" && (
                <AlertTriangle className="size-3" aria-hidden="true" />
              )}
              {status.label}
            </Badge>
          </>
        )}
      </span>
    </li>
  );
}

function rowStatus(
  device: DeviceOut,
  openExcursions: number | undefined,
): { variant: BadgeVariant; label: string } {
  if (openExcursions !== undefined && openExcursions > 0) {
    return {
      variant: "warning",
      label:
        openExcursions === 1 ? "1 open excursion" : `${String(openExcursions)} open excursions`,
    };
  }
  if (device.status === "ACTIVE") return { variant: "success", label: "No alerts" };
  if (device.status === "PROVISIONED") return { variant: "info", label: "Not reporting yet" };
  return { variant: "neutral", label: device.status.toLowerCase() };
}
