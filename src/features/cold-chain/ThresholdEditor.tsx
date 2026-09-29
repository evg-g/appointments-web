import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { parseApiError } from "@/api/errors";
import { useCreateThresholdPolicy } from "@/api/hooks";
import { Alert, Button, Field, Input } from "@/components/ui";

const thresholdSchema = z
  .object({
    min_temperature_c: z.coerce.number(),
    max_temperature_c: z.coerce.number(),
    dwell_minutes: z.coerce.number().int().min(1),
    recovery_minutes: z.coerce.number().int().min(1),
  })
  .refine((values) => values.min_temperature_c < values.max_temperature_c, {
    message: "Minimum must be below maximum",
    path: ["max_temperature_c"],
  });

type ThresholdValues = z.infer<typeof thresholdSchema>;

interface ThresholdEditorProps {
  deviceId: string;
  onBandChange: (band: { min: number; max: number }) => void;
}

export function ThresholdEditor({ deviceId, onBandChange }: ThresholdEditorProps) {
  const createPolicy = useCreateThresholdPolicy();
  const form = useForm<ThresholdValues>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: {
      min_temperature_c: 2,
      max_temperature_c: 8,
      dwell_minutes: 30,
      recovery_minutes: 30,
    },
  });

  // Preview the band on the chart as the numbers change.
  const min = form.watch("min_temperature_c");
  const max = form.watch("max_temperature_c");
  useEffect(() => {
    const lo = Number(min);
    const hi = Number(max);
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo < hi) onBandChange({ min: lo, max: hi });
  }, [min, max, onBandChange]);

  function onSubmit(values: ThresholdValues) {
    createPolicy.mutate({
      device_id: deviceId,
      clinic_id: null,
      min_temperature_c: values.min_temperature_c,
      max_temperature_c: values.max_temperature_c,
      dwell_minutes: values.dwell_minutes,
      recovery_minutes: values.recovery_minutes,
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
      noValidate
    >
      {createPolicy.isSuccess && (
        <Alert variant="success" title="Saved">
          The threshold policy is now in effect for this device.
        </Alert>
      )}
      {createPolicy.isError && (
        <Alert variant="danger" title="Could not save policy">
          {parseApiError(createPolicy.error).message}
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Min °C" required error={form.formState.errors.min_temperature_c?.message}>
          <Input type="number" step="0.1" {...form.register("min_temperature_c")} />
        </Field>
        <Field label="Max °C" required error={form.formState.errors.max_temperature_c?.message}>
          <Input type="number" step="0.1" {...form.register("max_temperature_c")} />
        </Field>
        <Field
          label="Dwell (min)"
          required
          description="Minutes out of band before an excursion is raised."
          error={form.formState.errors.dwell_minutes?.message}
        >
          <Input type="number" min={1} {...form.register("dwell_minutes")} />
        </Field>
        <Field
          label="Recovery (min)"
          required
          description="Minutes back in band before it clears."
          error={form.formState.errors.recovery_minutes?.message}
        >
          <Input type="number" min={1} {...form.register("recovery_minutes")} />
        </Field>
      </div>
      <div>
        <Button type="submit" loading={createPolicy.isPending}>
          Save thresholds
        </Button>
      </div>
    </form>
  );
}
