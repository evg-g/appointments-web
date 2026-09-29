import { CalendarPlus } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import { flattenAppointments, useAppointments } from "@/api/hooks";
import { flattenClinics, useClinics } from "@/api/hooks";
import type { AppointmentOut } from "@/api/types";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Badge,
  Button,
  EmptyState,
  QueryBoundary,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";

import { STATUS_LABEL, STATUS_VARIANT } from "./status";

export function AppointmentList() {
  const navigate = useNavigate();
  const query = useAppointments();
  const clinicsQuery = useClinics();
  const clinicNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const clinic of flattenClinics(clinicsQuery.data)) map.set(clinic.id, clinic.name);
    return map;
  }, [clinicsQuery.data]);

  const appointments = flattenAppointments(query.data);

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Your upcoming and past bookings."
        actions={
          <Button asChild>
            <Link to="/appointments/new">
              <CalendarPlus className="size-4" aria-hidden="true" />
              Book appointment
            </Link>
          </Button>
        }
      />

      <QueryBoundary
        query={{
          isPending: query.isPending,
          isError: query.isError,
          error: query.error,
          data: appointments,
          isFetching: query.isFetching,
          refetch: query.refetch,
        }}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            icon={CalendarPlus}
            title="No appointments yet"
            description="Book your first appointment to see it here."
            action={
              <Button asChild>
                <Link to="/appointments/new">Book appointment</Link>
              </Button>
            }
          />
        }
      >
        {(rows) => (
          <div className="flex flex-col gap-4">
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Clinic</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((appointment: AppointmentOut) => (
                  <TR
                    key={appointment.id}
                    className="cursor-pointer hover:bg-sunken"
                    onClick={() => void navigate(`/appointments/${appointment.id}`)}
                  >
                    <TD>
                      <Link
                        to={`/appointments/${appointment.id}`}
                        className="font-medium text-fg hover:text-accent"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {formatDateTime(appointment.starts_at)}
                      </Link>
                    </TD>
                    <TD>{clinicNames.get(appointment.clinic_id) ?? "—"}</TD>
                    <TD>
                      <Badge variant={STATUS_VARIANT[appointment.status]}>
                        {STATUS_LABEL[appointment.status]}
                      </Badge>
                    </TD>
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
    </>
  );
}
