import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { parseApiError } from "@/api/errors";
import { flattenClinicians, useClinicians, useCreateClinician, useCreateUser } from "@/api/hooks";
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
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { weekdayName } from "@/lib/datetime";

import { ClinicPicker } from "./ClinicPicker";
import { clinicianSchema } from "./schemas";
import type { ClinicianValues } from "./schemas";

export function CliniciansAdmin() {
  const [clinicId, setClinicId] = useState("");
  const query = useClinicians(clinicId);
  const createUser = useCreateUser();
  const createClinician = useCreateClinician(clinicId);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ClinicianValues>({
    resolver: zodResolver(clinicianSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      specialty: "",
      buffer_minutes: 10,
      weekday: 0,
      work_start: "09:00",
      work_end: "17:00",
    },
  });

  const clinicians = flattenClinicians(query.data);
  const submitting = createUser.isPending || createClinician.isPending;

  async function onSubmit(values: ClinicianValues) {
    setFormError(null);
    try {
      const user = await createUser.mutateAsync({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        role: "CLINICIAN",
      });
      await createClinician.mutateAsync({
        user_id: user.id,
        clinic_id: clinicId,
        specialty: values.specialty,
        buffer_minutes: values.buffer_minutes,
        working_hours: [
          {
            weekday: values.weekday,
            start: `${values.work_start}:00`,
            end: `${values.work_end}:00`,
          },
        ],
      });
      form.reset();
      setShowForm(false);
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      for (const [fieldName, message] of Object.entries(parsed.fieldErrors)) {
        if (fieldName in clinicianSchema.shape) {
          form.setError(fieldName as keyof ClinicianValues, { message });
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ClinicPicker value={clinicId} onChange={setClinicId} />

      {clinicId === "" ? (
        <EmptyState
          title="Select a clinic"
          description="Choose a clinic to manage its clinicians."
        />
      ) : (
        <>
          <div className="flex justify-end">
            <Button
              onClick={() => setShowForm((open) => !open)}
              variant={showForm ? "ghost" : "primary"}
            >
              <Plus className="size-4" aria-hidden="true" />
              {showForm ? "Close" : "New clinician"}
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>New clinician</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
                  noValidate
                >
                  {formError !== null && (
                    <Alert variant="danger" title="Could not create clinician">
                      {formError}
                    </Alert>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Full name"
                      required
                      error={form.formState.errors.full_name?.message}
                    >
                      <Input {...form.register("full_name")} />
                    </Field>
                    <Field
                      label="Specialty"
                      required
                      error={form.formState.errors.specialty?.message}
                    >
                      <Input {...form.register("specialty")} />
                    </Field>
                    <Field label="Email" required error={form.formState.errors.email?.message}>
                      <Input type="email" {...form.register("email")} />
                    </Field>
                    <Field
                      label="Temporary password"
                      required
                      error={form.formState.errors.password?.message}
                    >
                      <Input type="password" {...form.register("password")} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-4">
                    <Field
                      label="Buffer (min)"
                      error={form.formState.errors.buffer_minutes?.message}
                    >
                      <Input type="number" min={0} {...form.register("buffer_minutes")} />
                    </Field>
                    <Field label="Working weekday" error={form.formState.errors.weekday?.message}>
                      <Select {...form.register("weekday")}>
                        {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
                          <option key={weekday} value={weekday}>
                            {weekdayName(weekday)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Start" error={form.formState.errors.work_start?.message}>
                      <Input type="time" {...form.register("work_start")} />
                    </Field>
                    <Field label="End" error={form.formState.errors.work_end?.message}>
                      <Input type="time" {...form.register("work_end")} />
                    </Field>
                  </div>
                  <div>
                    <Button type="submit" loading={submitting}>
                      Create clinician
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <QueryBoundary
            query={{
              isPending: query.isPending,
              isError: query.isError,
              error: query.error,
              data: clinicians,
              isFetching: query.isFetching,
              refetch: query.refetch,
            }}
            isEmpty={(rows) => rows.length === 0}
            empty={
              <EmptyState
                title="No clinicians yet"
                description="Add the first clinician for this clinic."
              />
            }
          >
            {(rows) => (
              <Table>
                <THead>
                  <TR>
                    <TH>Specialty</TH>
                    <TH numeric>Buffer (min)</TH>
                    <TH>Working days</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((clinician) => (
                    <TR key={clinician.id}>
                      <TD className="font-medium">{clinician.specialty}</TD>
                      <TD numeric>{clinician.buffer_minutes}</TD>
                      <TD>
                        {clinician.working_hours.length === 0
                          ? "—"
                          : clinician.working_hours
                              .map((window) => weekdayName(window.weekday).slice(0, 3))
                              .join(", ")}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </QueryBoundary>
        </>
      )}
    </div>
  );
}
