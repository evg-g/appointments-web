import { CalendarPlus, CalendarRange } from "lucide-react";
import { Link } from "react-router-dom";

import { flattenAppointments, useAppointments } from "@/api/hooks";
import { RoleGate } from "@/auth/RoleGate";
import { useAuth } from "@/auth/useAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, EmptyState, QueryBoundary, SimpleCard, Spinner } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { ColdChainSummary } from "@/features/cold-chain/ColdChainSummary";
import { STATUS_LABEL, STATUS_VARIANT } from "@/features/appointments/status";
import { upcomingAppointments } from "@/features/appointments/upcoming";

/** The landing page: a greeting, quick actions, a peek at upcoming appointments, and cold chain. */
export function DashboardRoute() {
  const { user } = useAuth();
  const firstName = user?.full_name.split(" ")[0] ?? "there";
  // The list is newest-first, so a page of 5 would hold the furthest-out bookings, not the next
  // ones. Fetch one larger page and let upcomingAppointments() pick the soonest five.
  const appointmentsQuery = useAppointments({ limit: 50 });
  const upcoming = upcomingAppointments(flattenAppointments(appointmentsQuery.data), Date.now(), 5);

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Here is what is happening today."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link to="/calendar">
                <CalendarRange className="size-4" aria-hidden="true" />
                Calendar
              </Link>
            </Button>
            <Button asChild>
              <Link to="/appointments/new">
                <CalendarPlus className="size-4" aria-hidden="true" />
                Book
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <SimpleCard title="Upcoming appointments">
          <QueryBoundary
            query={{
              isPending: appointmentsQuery.isPending,
              isError: appointmentsQuery.isError,
              error: appointmentsQuery.error,
              data: upcoming,
              isFetching: appointmentsQuery.isFetching,
              refetch: appointmentsQuery.refetch,
            }}
            loading={<Spinner label="Loading appointments" />}
            isEmpty={(rows) => rows.length === 0}
            empty={
              <EmptyState
                title="No upcoming appointments"
                description="Book one to see it here."
                action={
                  <Button asChild size="sm">
                    <Link to="/appointments/new">
                      <CalendarPlus className="size-4" aria-hidden="true" />
                      Book appointment
                    </Link>
                  </Button>
                }
              />
            }
          >
            {(rows) => (
              <ul className="flex flex-col divide-y divide-line">
                {rows.map((appointment) => (
                  <li key={appointment.id}>
                    <Link
                      to={`/appointments/${appointment.id}`}
                      className="flex items-center justify-between gap-2 py-2 hover:text-accent"
                    >
                      <span className="text-sm tabular-nums text-fg">
                        {formatDateTime(appointment.starts_at)}
                      </span>
                      <Badge variant={STATUS_VARIANT[appointment.status]}>
                        {STATUS_LABEL[appointment.status]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </SimpleCard>

        <RoleGate
          allow={["CLINICIAN", "CLINIC_ADMIN", "PLATFORM_ADMIN"]}
          fallback={
            <SimpleCard title="Your care team">
              <EmptyState
                title="Nothing to show"
                description="Your clinic updates will appear here."
              />
            </SimpleCard>
          }
        >
          <SimpleCard title="Cold-chain status">
            <ColdChainSummary />
          </SimpleCard>
        </RoleGate>
      </div>
    </>
  );
}
