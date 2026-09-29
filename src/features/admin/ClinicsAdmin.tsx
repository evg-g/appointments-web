import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { parseApiError } from "@/api/errors";
import { flattenClinics, useClinics, useCreateClinic } from "@/api/hooks";
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
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";

import { clinicSchema } from "./schemas";
import type { ClinicValues } from "./schemas";

export function ClinicsAdmin() {
  const query = useClinics();
  const createClinic = useCreateClinic();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ClinicValues>({
    resolver: zodResolver(clinicSchema),
    defaultValues: { name: "", address: "", timezone: "", cancellation_cutoff_hours: 24 },
  });

  const clinics = flattenClinics(query.data);

  function onSubmit(values: ClinicValues) {
    setFormError(null);
    createClinic.mutate(values, {
      onSuccess: () => {
        form.reset();
        setShowForm(false);
      },
      onError: (error) => {
        const parsed = parseApiError(error);
        setFormError(parsed.message);
        for (const [fieldName, message] of Object.entries(parsed.fieldErrors)) {
          if (fieldName in clinicSchema.shape) {
            form.setError(fieldName as keyof ClinicValues, { message });
          }
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm((open) => !open)}
          variant={showForm ? "ghost" : "primary"}
        >
          <Plus className="size-4" aria-hidden="true" />
          {showForm ? "Close" : "New clinic"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New clinic</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
              noValidate
            >
              {formError !== null && (
                <Alert variant="danger" title="Could not create clinic">
                  {formError}
                </Alert>
              )}
              <Field label="Name" required error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} />
              </Field>
              <Field label="Address" required error={form.formState.errors.address?.message}>
                <Input {...form.register("address")} />
              </Field>
              <Field
                label="Timezone"
                required
                description="IANA name, e.g. America/Los_Angeles"
                error={form.formState.errors.timezone?.message}
              >
                <Input {...form.register("timezone")} placeholder="America/Los_Angeles" />
              </Field>
              <Field
                label="Cancellation cutoff (hours)"
                required
                error={form.formState.errors.cancellation_cutoff_hours?.message}
              >
                <Input type="number" min={0} {...form.register("cancellation_cutoff_hours")} />
              </Field>
              <div>
                <Button type="submit" loading={createClinic.isPending}>
                  Create clinic
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
          data: clinics,
          isFetching: query.isFetching,
          refetch: query.refetch,
        }}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="No clinics yet"
            description="Create the first clinic to get started."
          />
        }
      >
        {(rows) => (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Address</TH>
                <TH>Timezone</TH>
                <TH numeric>Cutoff (h)</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((clinic) => (
                <TR key={clinic.id}>
                  <TD className="font-medium">{clinic.name}</TD>
                  <TD>{clinic.address}</TD>
                  <TD>{clinic.timezone}</TD>
                  <TD numeric>{clinic.cancellation_cutoff_hours}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </QueryBoundary>
    </div>
  );
}
