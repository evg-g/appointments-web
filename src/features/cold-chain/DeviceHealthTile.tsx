import { AlertTriangle, Thermometer } from "lucide-react";

import { useDeviceHealth } from "@/api/hooks";
import type { DeviceOut } from "@/api/types";
import { Badge, Card, CardContent, Skeleton } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { formatRelative } from "@/lib/datetime";
import { formatBattery, formatTemperature } from "@/lib/units";

const STATUS_VARIANT: Record<DeviceOut["status"], BadgeVariant> = {
  ACTIVE: "success",
  PROVISIONED: "info",
  DISABLED: "warning",
  RETIRED: "neutral",
};

export function DeviceHealthTile({ device }: { device: DeviceOut }) {
  // Poll health every 15s so the tile stays fresh even between SSE readings.
  const query = useDeviceHealth(device.id, 15_000);
  const health = query.data;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-fg">{device.location_label}</p>
            <p className="text-xs text-muted">fw {device.firmware_version}</p>
          </div>
          <Badge variant={STATUS_VARIANT[device.status]}>{device.status.toLowerCase()}</Badge>
        </div>

        {query.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : query.isError || health === undefined ? (
          <p className="text-sm text-danger-fg">Health unavailable</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Last seen</dt>
            <dd className="text-right text-fg tabular-nums">
              {formatRelative(health.last_seen_at)}
            </dd>
            <dt className="text-muted">Temperature</dt>
            <dd className="flex items-center justify-end gap-1 text-fg tabular-nums">
              <Thermometer className="size-3.5 text-muted" aria-hidden="true" />
              {formatTemperature(health.last_temperature_c)}
            </dd>
            <dt className="text-muted">Battery</dt>
            <dd className="text-right text-fg tabular-nums">
              {formatBattery(health.last_battery_pct)}
            </dd>
            <dt className="text-muted">Open excursions</dt>
            <dd className="flex items-center justify-end gap-1 text-fg tabular-nums">
              {health.open_excursions > 0 && (
                <AlertTriangle className="size-3.5 text-warning-fg" aria-hidden="true" />
              )}
              {health.open_excursions}
            </dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
