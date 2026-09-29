import { flattenClinics, useClinics } from "@/api/hooks";
import { Field, Select } from "@/components/ui";

interface ClinicPickerProps {
  value: string;
  onChange: (clinicId: string) => void;
}

/** Shared clinic selector for the clinic-scoped admin sections (services, clinicians). */
export function ClinicPicker({ value, onChange }: ClinicPickerProps) {
  const query = useClinics();
  const clinics = flattenClinics(query.data);

  return (
    <Field
      label="Clinic"
      className="max-w-sm"
      description="Services and clinicians are scoped to a clinic."
    >
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={query.isPending}
      >
        <option value="">Select a clinic</option>
        {clinics.map((clinic) => (
          <option key={clinic.id} value={clinic.id}>
            {clinic.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}
