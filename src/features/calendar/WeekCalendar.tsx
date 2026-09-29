import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  flattenClinicians,
  flattenClinics,
  flattenServices,
  useAvailability,
  useClinicians,
  useClinics,
  useServices,
} from "@/api/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, EmptyState, Field, Select, Skeleton } from "@/components/ui";
import {
  addDays,
  formatColumnLabel,
  formatTime,
  startOfWeek,
  toIsoDate,
  weekDays,
} from "@/lib/datetime";

export function WeekCalendar() {
  const [clinicId, setClinicId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [clinicianId, setClinicianId] = useState("");
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));

  const clinicsQuery = useClinics();
  const servicesQuery = useServices(clinicId);
  const cliniciansQuery = useClinicians(clinicId);

  const clinics = flattenClinics(clinicsQuery.data);
  const services = flattenServices(servicesQuery.data);
  const clinicians = flattenClinicians(cliniciansQuery.data);
  const days = weekDays(anchor);
  const ready = clinicId !== "" && serviceId !== "" && clinicianId !== "";

  return (
    <>
      <PageHeader
        title="Calendar"
        description="A week of a clinician's open slots. Pick one to start a booking."
      />

      <Card className="mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
        <Field label="Clinic" className="flex-1">
          <Select
            value={clinicId}
            onChange={(event) => {
              setClinicId(event.target.value);
              setServiceId("");
              setClinicianId("");
            }}
          >
            <option value="">Select a clinic</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Service" className="flex-1">
          <Select
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            disabled={clinicId === ""}
          >
            <option value="">Select a service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Clinician" className="flex-1">
          <Select
            value={clinicianId}
            onChange={(event) => setClinicianId(event.target.value)}
            disabled={clinicId === ""}
          >
            <option value="">Select a clinician</option>
            {clinicians.map((clinician) => (
              <option key={clinician.id} value={clinician.id}>
                {clinician.specialty}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {!ready ? (
        <EmptyState
          title="Choose a clinic, service, and clinician"
          description="Availability appears once all three are selected."
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setAnchor((current) => addDays(current, -7))}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Previous
            </Button>
            <span className="text-sm font-medium text-fg">
              Week of {formatColumnLabel(days[0]?.toISOString() ?? "")}
            </span>
            <Button variant="secondary" onClick={() => setAnchor((current) => addDays(current, 7))}>
              Next
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
            {days.map((date) => (
              <DayColumn
                key={date.toISOString()}
                date={date}
                clinicianId={clinicianId}
                serviceId={serviceId}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

interface DayColumnProps {
  date: Date;
  clinicianId: string;
  serviceId: string;
}

function DayColumn({ date, clinicianId, serviceId }: DayColumnProps) {
  const navigate = useNavigate();
  const day = toIsoDate(date);
  const query = useAvailability({ clinicianId, serviceId, day });

  return (
    <div className="rounded-lg border border-line bg-surface p-2">
      <h3 className="mb-2 text-center text-sm font-semibold text-fg">
        {formatColumnLabel(date.toISOString())}
      </h3>
      {query.isPending ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : query.isError ? (
        <p className="text-center text-xs text-danger-fg">Failed to load</p>
      ) : (query.data ?? []).length === 0 ? (
        <p className="text-center text-xs text-subtle">No slots</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {(query.data ?? []).map((slot) => (
            <li key={slot.start}>
              <button
                type="button"
                onClick={() => void navigate("/appointments/new")}
                className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-center text-sm tabular-nums text-fg hover:border-accent hover:bg-sunken"
              >
                {formatTime(slot.start)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
