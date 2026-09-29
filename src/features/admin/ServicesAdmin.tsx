import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { parseApiError } from "@/api/errors";
import { flattenServices, useCreateService, useServices } from "@/api/hooks";
import {
  Alert,
  Badge,
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
import { formatDuration, formatMoney } from "@/lib/units";

import { ClinicPicker } from "./ClinicPicker";
import { serviceSchema } from "./schemas";
import type { ServiceValues } from "./schemas";

export function ServicesAdmin() {
  const [clinicId, setClinicId] = useState("");
  const query = useServices(clinicId);
  const createService = useCreateService(clinicId);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      duration_minutes: 30,
      price_cents: 0,
      currency: "USD",
      is_active: true,
    },
  });

  const services = flattenServices(query.data);

  function onSubmit(values: ServiceValues) {
    setFormError(null);
    createService.mutate(
      { clinic_id: clinicId, ...values },
      {
        onSuccess: () => {
          form.reset();
          setShowForm(false);
        },
        onError: (error) => {
          const parsed = parseApiError(error);
          setFormError(parsed.message);
          for (const [fieldName, message] of Object.entries(parsed.fieldErrors)) {
            if (fieldName in serviceSchema.shape) {
              form.setError(fieldName as keyof ServiceValues, { message });
            }
          }
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ClinicPicker value={clinicId} onChange={setClinicId} />

      {clinicId === "" ? (
        <EmptyState title="Select a clinic" description="Choose a clinic to manage its services." />
      ) : (
        <>
          <div className="flex justify-end">
            <Button
              onClick={() => setShowForm((open) => !open)}
              variant={showForm ? "ghost" : "primary"}
            >
              <Plus className="size-4" aria-hidden="true" />
              {showForm ? "Close" : "New service"}
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>New service</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
                  noValidate
                >
                  {formError !== null && (
                    <Alert variant="danger" title="Could not create service">
                      {formError}
                    </Alert>
                  )}
                  <Field label="Name" required error={form.formState.errors.name?.message}>
                    <Input {...form.register("name")} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field
                      label="Duration (min)"
                      required
                      error={form.formState.errors.duration_minutes?.message}
                    >
                      <Input type="number" min={5} {...form.register("duration_minutes")} />
                    </Field>
                    <Field
                      label="Price (cents)"
                      required
                      error={form.formState.errors.price_cents?.message}
                    >
                      <Input type="number" min={0} {...form.register("price_cents")} />
                    </Field>
                    <Field
                      label="Currency"
                      required
                      error={form.formState.errors.currency?.message}
                    >
                      <Input maxLength={3} {...form.register("currency")} />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-fg">
                    <input type="checkbox" {...form.register("is_active")} className="size-4" />
                    Active
                  </label>
                  <div>
                    <Button type="submit" loading={createService.isPending}>
                      Create service
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
              data: services,
              isFetching: query.isFetching,
              refetch: query.refetch,
            }}
            isEmpty={(rows) => rows.length === 0}
            empty={
              <EmptyState
                title="No services yet"
                description="Add the first service for this clinic."
              />
            }
          >
            {(rows) => (
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH numeric>Duration</TH>
                    <TH numeric>Price</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((service) => (
                    <TR key={service.id}>
                      <TD className="font-medium">{service.name}</TD>
                      <TD numeric>{formatDuration(service.duration_minutes)}</TD>
                      <TD numeric>{formatMoney(service.price_cents, service.currency)}</TD>
                      <TD>
                        <Badge variant={service.is_active ? "success" : "neutral"}>
                          {service.is_active ? "Active" : "Inactive"}
                        </Badge>
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
