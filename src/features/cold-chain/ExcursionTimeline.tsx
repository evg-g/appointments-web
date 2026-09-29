import { ArrowDown, ArrowUp, CheckCircle2 } from "lucide-react";

import { parseApiError } from "@/api/errors";
import { flattenExcursions, useAcknowledgeExcursion, useDeviceExcursions } from "@/api/hooks";
import type { ExcursionOut } from "@/api/types";
import { Alert, Badge, Button, EmptyState, QueryBoundary } from "@/components/ui";
import { formatDateTime, formatRelative } from "@/lib/datetime";
import { formatTemperature } from "@/lib/units";

export function ExcursionTimeline({ deviceId }: { deviceId: string }) {
  const query = useDeviceExcursions(deviceId);
  const acknowledge = useAcknowledgeExcursion(deviceId);
  const excursions = flattenExcursions(query.data);

  return (
    <div className="flex flex-col gap-3">
      {acknowledge.isError && (
        <Alert variant="danger" title="Could not acknowledge">
          {parseApiError(acknowledge.error).message}
        </Alert>
      )}
      <QueryBoundary
        query={{
          isPending: query.isPending,
          isError: query.isError,
          error: query.error,
          data: excursions,
          isFetching: query.isFetching,
          refetch: query.refetch,
        }}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            icon={CheckCircle2}
            title="No excursions"
            description="This device has stayed within its safe temperature band."
          />
        }
      >
        {(rows) => (
          <ol className="flex flex-col gap-3">
            {rows.map((excursion: ExcursionOut) => {
              const open = excursion.ended_at === null;
              const acknowledged = excursion.acknowledged_at !== null;
              return (
                <li
                  key={excursion.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        excursion.direction === "high"
                          ? "flex size-8 items-center justify-center rounded-full bg-danger-bg text-danger-fg"
                          : "flex size-8 items-center justify-center rounded-full bg-info-bg text-info-fg"
                      }
                      aria-hidden="true"
                    >
                      {excursion.direction === "high" ? (
                        <ArrowUp className="size-4" />
                      ) : (
                        <ArrowDown className="size-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-fg">
                        {excursion.direction === "high" ? "Too warm" : "Too cold"} · peak{" "}
                        {formatTemperature(excursion.peak_temperature_c)}
                      </p>
                      <p className="text-xs text-muted">
                        Started {formatDateTime(excursion.started_at)}
                        {excursion.ended_at !== null &&
                          ` · cleared ${formatRelative(excursion.ended_at)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {open ? (
                      <Badge variant="danger">Open</Badge>
                    ) : (
                      <Badge variant="neutral">Cleared</Badge>
                    )}
                    {acknowledged ? (
                      <Badge variant="success">Acknowledged</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={acknowledge.isPending && acknowledge.variables === excursion.id}
                        onClick={() => acknowledge.mutate(excursion.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </QueryBoundary>

      {query.hasNextPage === true && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => void query.fetchNextPage()}
            loading={query.isFetchingNextPage}
          >
            Load older
          </Button>
        </div>
      )}
    </div>
  );
}
