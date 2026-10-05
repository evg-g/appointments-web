import {
  useAppointment,
  useClinic,
  useDevice,
  useExcursion,
  useService,
  useUser,
} from "@/api/hooks";
import { useClinicTimeZones } from "@/features/appointments/useClinicTimeZones";
import { formatDateTime, zoneSuffix } from "@/lib/datetime";

/*
 * Readable names for the audit log. An entry only carries ids, so each cell looks its entity up
 * through the normal detail hooks (cached, so a repeated id costs one request). Any lookup that is
 * still loading, forbidden, or gone falls back to the short id: the log must always render, and a
 * clinic admin may not read other users' records (GET /users/{id} is platform-admin only).
 */

function ShortId({ id }: { id: string }) {
  // text-muted, not text-subtle: this id is meaningful content and must meet WCAG AA contrast
  // (the a11y gate caught text-subtle at 4.08:1).
  return (
    <span className="text-muted tabular-nums" title={id}>
      {id.slice(0, 8)}
    </span>
  );
}

function Named({ name, id }: { name: string | undefined; id: string }) {
  return name !== undefined ? <span title={id}>{name}</span> : <ShortId id={id} />;
}

/** Who did it: a person's name, "System" for automated entries, or the short id as a fallback. */
export function AuditActor({ actorId }: { actorId: string | null }) {
  if (actorId === null) return <span className="text-muted">System</span>;
  return <UserName id={actorId} />;
}

/** What it was done to: the entity type, then a readable name for the entity. */
export function AuditEntity({ type, id }: { type: string; id: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-fg">
        <EntityName type={type} id={id} />
      </span>
      <span className="text-xs text-muted">{type}</span>
    </span>
  );
}

function EntityName({ type, id }: { type: string; id: string }) {
  switch (type) {
    case "appointment":
      return <AppointmentName id={id} />;
    case "clinic":
      return <ClinicName id={id} />;
    case "device":
      return <DeviceName id={id} />;
    case "excursion":
      return <ExcursionName id={id} />;
    case "service":
      return <ServiceName id={id} />;
    case "user":
      return <UserName id={id} />;
    default:
      return <ShortId id={id} />;
  }
}

function UserName({ id }: { id: string }) {
  return <Named name={useUser(id).data?.full_name} id={id} />;
}

function ClinicName({ id }: { id: string }) {
  return <Named name={useClinic(id).data?.name} id={id} />;
}

function ServiceName({ id }: { id: string }) {
  return <Named name={useService(id).data?.name} id={id} />;
}

function DeviceName({ id }: { id: string }) {
  return <Named name={useDevice(id).data?.location_label} id={id} />;
}

function AppointmentName({ id }: { id: string }) {
  const appointment = useAppointment(id).data?.appointment;
  const timeZone = useClinicTimeZones().get(appointment?.clinic_id ?? "");
  return (
    <Named
      name={
        appointment !== undefined
          ? formatDateTime(appointment.starts_at, timeZone) +
            zoneSuffix(timeZone, appointment.starts_at)
          : undefined
      }
      id={id}
    />
  );
}

function ExcursionName({ id }: { id: string }) {
  const excursion = useExcursion(id).data;
  const device = useDevice(excursion?.device_id ?? "").data;
  const name =
    excursion !== undefined && device !== undefined
      ? `${excursion.direction === "high" ? "High" : "Low"} · ${device.location_label}`
      : undefined;
  return <Named name={name} id={id} />;
}
