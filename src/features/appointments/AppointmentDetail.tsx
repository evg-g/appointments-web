import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { parseApiError } from "@/api/errors";
import {
  useAppointment,
  useCancelAppointment,
  useClinic,
  useClinician,
  useService,
  useTransitionAppointment,
} from "@/api/hooks";
import type { AppointmentDetail as AppointmentDetailData } from "@/api/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  QueryBoundary,
  Textarea,
} from "@/components/ui";
import { formatDate, formatTime, zoneSuffix } from "@/lib/datetime";

import { canCancel, isTerminal, STATUS_LABEL, STATUS_VARIANT, TRANSITION_TARGETS } from "./status";

export function AppointmentDetail() {
  const params = useParams();
  const id = params["appointmentId"] ?? "";
  const query = useAppointment(id);

  return (
    <>
      <PageHeader
        title="Appointment"
        actions={
          <Button asChild variant="ghost">
            <Link to="/appointments">
              <ArrowLeft className="size-4" aria-hidden="true" />
              All appointments
            </Link>
          </Button>
        }
      />
      <QueryBoundary query={query}>{(data) => <DetailBody id={id} data={data} />}</QueryBoundary>
    </>
  );
}

function DetailBody({ id, data }: { id: string; data: AppointmentDetailData }) {
  const { appointment, etag } = data;
  const clinicQuery = useClinic(appointment.clinic_id);
  const serviceQuery = useService(appointment.service_id);
  const clinicianQuery = useClinician(appointment.clinician_id);
  const transition = useTransitionAppointment();
  const cancel = useCancelAppointment();

  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");

  const timezone = clinicQuery.data?.timezone;
  const targets = TRANSITION_TARGETS[appointment.status];
  const mutationError = transition.isError
    ? transition.error
    : cancel.isError
      ? cancel.error
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{formatDate(appointment.starts_at, timezone)}</CardTitle>
          <Badge variant={STATUS_VARIANT[appointment.status]}>
            {STATUS_LABEL[appointment.status]}
          </Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted">Time</dt>
            <dd className="text-fg tabular-nums">
              {formatTime(appointment.starts_at, timezone)}–
              {formatTime(appointment.ends_at, timezone)}
              {zoneSuffix(timezone, appointment.starts_at)}
            </dd>
            <dt className="text-muted">Clinic</dt>
            <dd className="text-fg">{clinicQuery.data?.name ?? "…"}</dd>
            <dt className="text-muted">Service</dt>
            <dd className="text-fg">{serviceQuery.data?.name ?? "…"}</dd>
            <dt className="text-muted">Clinician</dt>
            <dd className="text-fg">{clinicianQuery.data?.specialty ?? "…"}</dd>
            {appointment.cancellation_reason !== null && (
              <>
                <dt className="text-muted">Cancellation reason</dt>
                <dd className="text-fg">{appointment.cancellation_reason}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {mutationError !== null && (
        <Alert variant="danger" title="Action failed">
          {parseApiError(mutationError).message}
        </Alert>
      )}

      {!isTerminal(appointment.status) && (
        <Card>
          <CardHeader>
            <CardTitle>Manage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {targets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {targets.map((target) => (
                  <Button
                    key={target}
                    variant="secondary"
                    loading={transition.isPending && transition.variables?.targetStatus === target}
                    onClick={() => transition.mutate({ id, targetStatus: target, etag })}
                  >
                    Mark {STATUS_LABEL[target].toLowerCase()}
                  </Button>
                ))}
              </div>
            )}

            {canCancel(appointment.status) && !showCancel && (
              <div>
                <Button variant="danger" onClick={() => setShowCancel(true)}>
                  Cancel appointment
                </Button>
              </div>
            )}

            {showCancel && (
              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  cancel.mutate(
                    { id, reason: reason.trim() === "" ? null : reason.trim(), etag },
                    { onSuccess: () => setShowCancel(false) },
                  );
                }}
              >
                <Field label="Reason" description="Optional — shown on the appointment record.">
                  <Textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="e.g. patient requested reschedule"
                  />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" variant="danger" loading={cancel.isPending}>
                    Confirm cancellation
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowCancel(false)}>
                    Keep appointment
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
