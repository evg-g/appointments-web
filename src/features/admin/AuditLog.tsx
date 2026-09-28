import { ScrollText } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { flattenAuditLog, useAuditLog } from "@/api/hooks";
import type { AuditListParams } from "@/api/query-keys";
import type { AuditLogEntryOut } from "@/api/types";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  QueryBoundary,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";

const ENTITY_TYPES = ["appointment", "device", "excursion", "clinic", "service", "user"] as const;

export function AuditLog() {
  const [filters, setFilters] = useState<AuditListParams>({});
  const [draftAction, setDraftAction] = useState("");
  const [draftEntity, setDraftEntity] = useState("");
  const query = useAuditLog(filters);
  const rows = flattenAuditLog(query.data);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setFilters({
      ...(draftAction !== "" ? { action: draftAction } : {}),
      ...(draftEntity !== "" ? { entityType: draftEntity } : {}),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={applyFilters}>
        <Field label="Action" className="w-56">
          <Input
            value={draftAction}
            onChange={(event) => setDraftAction(event.target.value)}
            placeholder="e.g. appointment.confirmed"
          />
        </Field>
        <Field label="Entity type" className="w-48">
          <Select value={draftEntity} onChange={(event) => setDraftEntity(event.target.value)}>
            <option value="">All</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="secondary">
          Apply filters
        </Button>
        {(filters.action !== undefined || filters.entityType !== undefined) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraftAction("");
              setDraftEntity("");
              setFilters({});
            }}
          >
            Clear
          </Button>
        )}
      </form>

      <QueryBoundary
        query={{
          isPending: query.isPending,
          isError: query.isError,
          error: query.error,
          data: rows,
          isFetching: query.isFetching,
          refetch: query.refetch,
        }}
        isEmpty={(entries) => entries.length === 0}
        empty={
          <EmptyState
            icon={ScrollText}
            title="No audit entries"
            description="No activity matches these filters yet."
          />
        }
      >
        {(entries) => (
          <div className="flex flex-col gap-4">
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Action</TH>
                  <TH>Entity</TH>
                  <TH>Actor</TH>
                </TR>
              </THead>
              <TBody>
                {entries.map((entry: AuditLogEntryOut) => (
                  <TR key={entry.id}>
                    <TD className="whitespace-nowrap tabular-nums">
                      {formatDateTime(entry.created_at)}
                    </TD>
                    <TD>
                      <Badge variant="neutral">{entry.action}</Badge>
                    </TD>
                    <TD>
                      <span className="text-fg">{entry.entity_type}</span>
                      {/* text-muted, not text-subtle: this id is meaningful content and must meet
                          WCAG AA contrast (the a11y gate caught text-subtle at 4.08:1). */}
                      <span className="ml-1 text-muted">{entry.entity_id.slice(0, 8)}</span>
                    </TD>
                    <TD className="text-muted">{entry.actor_id?.slice(0, 8) ?? "system"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            {query.hasNextPage === true && (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => void query.fetchNextPage()}
                  loading={query.isFetchingNextPage}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
