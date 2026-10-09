import { CalendarPlus } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { flattenAppointments, useAppointments } from "@/api/hooks";
import { flattenClinics, useClinics } from "@/api/hooks";
import type { AppointmentOut, UserRole } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Badge,
  Button,
  EmptyState,
  QueryBoundary,
  Table,
  TBody,
  TD,
  Tabs,
  TH,
  THead,
  TR,
} from "@/components/ui";
import type { TabItem } from "@/components/ui";
import { formatDateTime, zoneSuffix } from "@/lib/datetime";

import { type AppointmentGroups, partitionAppointments } from "./appointmentGroups";
import { STATUS_LABEL, STATUS_VARIANT } from "./status";
import { useClinicTimeZones } from "./useClinicTimeZones";

/** The `?tab=` values of the list, in display order. */
type ListTab = "upcoming" | "needs-action" | "past" | "cancelled";

const TABS: readonly { value: ListTab; label: string; group: keyof AppointmentGroups }[] = [
  { value: "upcoming", label: "Upcoming", group: "upcoming" },
  { value: "needs-action", label: "Needs action", group: "needsAction" },
  { value: "past", label: "Past", group: "past" },
  { value: "cancelled", label: "Cancelled", group: "cancelled" },
];

/** The tabs a role sees: Needs action is for staff only. */
function tabsFor(role: UserRole): TabItem<ListTab>[] {
  return TABS.filter((tab) => tab.value !== "needs-action" || role !== "PATIENT").map(
    ({ value, label }) => ({ value, label }),
  );
}

/** The open tab from `?tab=`; Upcoming when it is missing, unknown or not allowed for the role. */
function selectedTab(param: string | null, items: readonly TabItem<ListTab>[]): ListTab {
  return items.find((item) => item.value === param)?.value ?? "upcoming";
}

export function AppointmentList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Without a resolved user, show the patient view (no staff-only tab).
  const role: UserRole = user?.role ?? "PATIENT";
  const tabItems = useMemo(() => tabsFor(role), [role]);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = selectedTab(searchParams.get("tab"), tabItems);
  const openTab = (value: ListTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", value);
        return next;
      },
      { replace: true },
    );
  };
  const query = useAppointments();
  const clinicsQuery = useClinics();
  const clinicNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const clinic of flattenClinics(clinicsQuery.data)) map.set(clinic.id, clinic.name);
    return map;
  }, [clinicsQuery.data]);
  const clinicTimeZones = useClinicTimeZones();

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
            <Tabs label="Appointments" items={tabItems} value={tab} onValueChange={openTab}>
              <Table>
                <THead>
                  <TR>
                    <TH>When</TH>
                    <TH>Clinic</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {partitionAppointments(rows, Date.now(), role)[
                    TABS.find((t) => t.value === tab)?.group ?? "upcoming"
                  ].map((appointment: AppointmentOut) => (
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
                          {formatDateTime(
                            appointment.starts_at,
                            clinicTimeZones.get(appointment.clinic_id),
                          )}
                          {zoneSuffix(
                            clinicTimeZones.get(appointment.clinic_id),
                            appointment.starts_at,
                          )}
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
            </Tabs>

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
