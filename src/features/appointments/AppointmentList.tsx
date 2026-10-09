import { CalendarPlus } from "lucide-react";
import { useId, useMemo } from "react";
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
import { formatTime, zoneSuffix } from "@/lib/datetime";

import {
  type AppointmentGroups,
  type DayGroup,
  groupByDay,
  partitionAppointments,
} from "./appointmentGroups";
import { STATUS_LABEL, STATUS_VARIANT } from "./status";
import { useClinicTimeZones } from "./useClinicTimeZones";

/** The `?tab=` values of the list, in display order. */
type ListTab = "upcoming" | "needs-action" | "past" | "cancelled";

interface ListTabDef {
  value: ListTab;
  label: string;
  group: keyof AppointmentGroups;
  /** Shown in the tab when it has no rows. */
  empty: string;
}

const UPCOMING: ListTabDef = {
  value: "upcoming",
  label: "Upcoming",
  group: "upcoming",
  empty: "No upcoming appointments",
};

const TABS: readonly ListTabDef[] = [
  UPCOMING,
  {
    value: "needs-action",
    label: "Needs action",
    group: "needsAction",
    empty: "Nothing needs action",
  },
  { value: "past", label: "Past", group: "past", empty: "No past appointments" },
  {
    value: "cancelled",
    label: "Cancelled",
    group: "cancelled",
    empty: "No cancelled appointments",
  },
];

/**
 * The tabs a role sees, each labelled with its count, e.g. "Upcoming (12)". Needs action is for
 * staff only.
 */
function tabsFor(role: UserRole, groups: AppointmentGroups): TabItem<ListTab>[] {
  return TABS.filter((tab) => tab.value !== "needs-action" || role !== "PATIENT").map(
    ({ value, label, group }) => ({ value, label: `${label} (${String(groups[group].length)})` }),
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const now = Date.now();
  const groups = partitionAppointments(appointments, now, role);
  const tabItems = tabsFor(role, groups);
  const tab = selectedTab(searchParams.get("tab"), tabItems);
  const current = TABS.find((t) => t.value === tab) ?? UPCOMING;
  const timeZoneOf = (a: AppointmentOut) => clinicTimeZones.get(a.clinic_id);

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
        {() => (
          <div className="flex flex-col gap-4">
            <Tabs label="Appointments" items={tabItems} value={tab} onValueChange={openTab}>
              {groups[current.group].length === 0 ? (
                <EmptyState
                  icon={CalendarPlus}
                  title={current.empty}
                  action={
                    <Button asChild>
                      <Link to="/appointments/new">Book appointment</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-6">
                  {groupByDay(groups[current.group], timeZoneOf, now).map((day) => (
                    <DaySection
                      key={day.key}
                      day={day}
                      clinicNames={clinicNames}
                      timeZoneOf={timeZoneOf}
                      onOpen={(id) => void navigate(`/appointments/${id}`)}
                    />
                  ))}
                </div>
              )}
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

interface DaySectionProps {
  day: DayGroup;
  clinicNames: ReadonlyMap<string, string>;
  timeZoneOf: (a: AppointmentOut) => string | undefined;
  onOpen: (id: string) => void;
}

/** One day heading and its rows: time with the clinic's zone (a link), clinic, status. */
function DaySection({ day, clinicNames, timeZoneOf, onOpen }: DaySectionProps) {
  const headingId = useId();
  return (
    <section role="group" aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-sm font-semibold text-muted">
        {day.label}
      </h2>
      <Table>
        <THead>
          <TR>
            <TH>Time</TH>
            <TH>Clinic</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {day.rows.map((appointment) => {
            const timeZone = timeZoneOf(appointment);
            return (
              <TR
                key={appointment.id}
                className="cursor-pointer hover:bg-sunken"
                onClick={() => onOpen(appointment.id)}
              >
                <TD>
                  <Link
                    to={`/appointments/${appointment.id}`}
                    className="font-medium text-fg hover:text-accent"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {formatTime(appointment.starts_at, timeZone)}
                    {zoneSuffix(timeZone, appointment.starts_at)}
                  </Link>
                </TD>
                <TD>{clinicNames.get(appointment.clinic_id) ?? "—"}</TD>
                <TD>
                  <Badge variant={STATUS_VARIANT[appointment.status]}>
                    {STATUS_LABEL[appointment.status]}
                  </Badge>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </section>
  );
}
