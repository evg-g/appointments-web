import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  flattenClinicians,
  flattenClinics,
  flattenServices,
  useAvailability,
  useClinicians,
  useClinics,
  useCreateAppointment,
  useServices,
} from "@/api/hooks";
import type { AppointmentOut, SlotOut } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  QueryBoundary,
  Select,
  Spinner,
} from "@/components/ui";
import { parseApiError } from "@/api/errors";
import { formatDate, formatTime, formatTimeZoneLabel, toIsoDate } from "@/lib/datetime";
import { formatDuration, formatMoney } from "@/lib/units";

const STEPS = ["Clinic", "Service", "Clinician", "Time", "Confirm"] as const;

export function BookingFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [clinicId, setClinicId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [clinicianId, setClinicianId] = useState("");
  const [day, setDay] = useState(toIsoDate(new Date()));
  const [slot, setSlot] = useState<SlotOut | null>(null);

  const clinicsQuery = useClinics();
  const servicesQuery = useServices(clinicId);
  const cliniciansQuery = useClinicians(clinicId);
  const availabilityQuery = useAvailability({ clinicianId, serviceId, day });
  const createAppointment = useCreateAppointment();

  const clinics = flattenClinics(clinicsQuery.data);
  const services = flattenServices(servicesQuery.data);
  const clinicians = flattenClinicians(cliniciansQuery.data);

  const selectedClinic = clinics.find((c) => c.id === clinicId);
  const selectedService = services.find((s) => s.id === serviceId);
  const selectedClinician = clinicians.find((c) => c.id === clinicianId);

  // A stable idempotency key per (slot) choice, so a retried submit cannot double-book.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const slotKey = slot?.start ?? "";
  const lastSlotKeyRef = useRef(slotKey);
  if (slotKey !== lastSlotKeyRef.current) {
    lastSlotKeyRef.current = slotKey;
    idempotencyKeyRef.current = crypto.randomUUID();
  }

  const canNext = useMemo(() => {
    if (step === 0) return clinicId !== "";
    if (step === 1) return serviceId !== "";
    if (step === 2) return clinicianId !== "";
    if (step === 3) return slot !== null;
    return true;
  }, [step, clinicId, serviceId, clinicianId, slot]);

  function resetFrom(level: number) {
    if (level <= 0) setServiceId("");
    if (level <= 1) setClinicianId("");
    if (level <= 2) setSlot(null);
    if (level <= 3) setSlot(null);
  }

  function submit() {
    if (slot === null || selectedClinic === undefined || user === null) return;
    const optimistic: AppointmentOut = {
      id: `optimistic-${idempotencyKeyRef.current}`,
      clinic_id: clinicId,
      clinician_id: clinicianId,
      patient_id: user.id,
      service_id: serviceId,
      starts_at: slot.start,
      ends_at: slot.end,
      status: "REQUESTED",
      cancellation_reason: null,
      version: 1,
    };
    createAppointment.mutate(
      {
        body: {
          clinic_id: clinicId,
          clinician_id: clinicianId,
          service_id: serviceId,
          starts_at: slot.start,
        },
        idempotencyKey: idempotencyKeyRef.current,
        optimistic,
      },
      {
        onSuccess: (created) => {
          void navigate(`/appointments/${created.id}`);
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Book an appointment"
        description="Pick a clinic, service, clinician, and time."
      />

      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Booking progress">
        {STEPS.map((label, index) => (
          <li key={label}>
            <span
              aria-current={index === step ? "step" : undefined}
              className={
                index === step
                  ? "rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-fg"
                  : index < step
                    ? "rounded-full bg-accent-subtle px-3 py-1 text-sm text-accent-subtle-fg"
                    : "rounded-full bg-sunken px-3 py-1 text-sm text-muted"
              }
            >
              {String(index + 1)}. {label}
            </span>
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === 0 && (
            <SelectStep
              label="Clinic"
              loading={clinicsQuery.isPending}
              error={clinicsQuery.isError}
              value={clinicId}
              onChange={(value) => {
                setClinicId(value);
                resetFrom(0);
              }}
              placeholder="Select a clinic"
              options={clinics.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}

          {step === 1 && (
            <SelectStep
              label="Service"
              loading={servicesQuery.isPending}
              error={servicesQuery.isError}
              value={serviceId}
              onChange={(value) => {
                setServiceId(value);
                resetFrom(1);
              }}
              placeholder="Select a service"
              options={services.map((s) => ({
                value: s.id,
                label: `${s.name} · ${formatDuration(s.duration_minutes)} · ${formatMoney(s.price_cents, s.currency)}`,
              }))}
            />
          )}

          {step === 2 && (
            <SelectStep
              label="Clinician"
              loading={cliniciansQuery.isPending}
              error={cliniciansQuery.isError}
              value={clinicianId}
              onChange={(value) => {
                setClinicianId(value);
                resetFrom(2);
              }}
              placeholder="Select a clinician"
              options={clinicians.map((c) => ({ value: c.id, label: c.specialty }))}
            />
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <Field label="Day" className="max-w-xs">
                <Input
                  type="date"
                  value={day}
                  onChange={(event) => {
                    setDay(event.target.value);
                    setSlot(null);
                  }}
                />
              </Field>

              <QueryBoundary
                query={{
                  isPending: availabilityQuery.isPending,
                  isError: availabilityQuery.isError,
                  error: availabilityQuery.error,
                  data: availabilityQuery.data ?? [],
                  isFetching: availabilityQuery.isFetching,
                  refetch: availabilityQuery.refetch,
                }}
                isEmpty={(slots) => slots.length === 0}
                empty={
                  <EmptyState
                    title="No open slots"
                    description="This clinician has no availability on the chosen day. Try another day."
                  />
                }
              >
                {(slots) => (
                  <div className="flex flex-col gap-2">
                    {selectedClinic !== undefined && (
                      <p className="text-sm text-muted">
                        Times are in the clinic&apos;s time zone (
                        {formatTimeZoneLabel(selectedClinic.timezone, slots[0]?.start)}).
                      </p>
                    )}
                    <div
                      role="listbox"
                      aria-label="Available times"
                      className="flex flex-wrap gap-2"
                    >
                      {slots.map((option: SlotOut) => {
                        const selected = slot?.start === option.start;
                        return (
                          <button
                            key={option.start}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => setSlot(option)}
                            className={
                              selected
                                ? "rounded-md border border-accent bg-accent px-3 py-2 text-sm text-accent-fg"
                                : "rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg hover:border-accent"
                            }
                          >
                            {formatTime(option.start, selectedClinic?.timezone)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </QueryBoundary>
            </div>
          )}

          {step === 4 && slot !== null && (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted">Clinic</dt>
                <dd className="text-fg">{selectedClinic?.name ?? "—"}</dd>
                <dt className="text-muted">Service</dt>
                <dd className="text-fg">{selectedService?.name ?? "—"}</dd>
                <dt className="text-muted">Clinician</dt>
                <dd className="text-fg">{selectedClinician?.specialty ?? "—"}</dd>
                <dt className="text-muted">When</dt>
                <dd className="text-fg">
                  {formatDate(slot.start, selectedClinic?.timezone)},{" "}
                  {formatTime(slot.start, selectedClinic?.timezone)}
                  {"–"}
                  {formatTime(slot.end, selectedClinic?.timezone)}
                </dd>
              </dl>

              {createAppointment.isError && (
                <Alert variant="danger" title="Could not book">
                  {parseApiError(createAppointment.error).message}
                </Alert>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Next
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={submit} loading={createAppointment.isPending}>
                <Check className="size-4" aria-hidden="true" />
                Confirm booking
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

interface SelectStepProps {
  label: string;
  loading: boolean;
  error: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}

function SelectStep({
  label,
  loading,
  error,
  value,
  onChange,
  placeholder,
  options,
}: SelectStepProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Spinner size="sm" /> Loading {label.toLowerCase()}…
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="danger" title={`Could not load ${label.toLowerCase()}`}>
        Please try again.
      </Alert>
    );
  }
  if (options.length === 0) {
    return (
      <EmptyState
        title={`No ${label.toLowerCase()} available`}
        description="Nothing to choose here yet."
      />
    );
  }
  return (
    <Field label={label}>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
