// Convenience aliases over the generated OpenAPI schema. These are type-only re-exports of the
// contract's own component schemas — never hand-written request/response shapes — so a backend
// change still surfaces here as a TypeScript error. Import feature types from this module.
import type { components } from "./schema";

type Schemas = components["schemas"];

// Auth / users
export type UserOut = Schemas["UserOut"];
export type UserCreate = Schemas["UserCreate"];
export type UserRole = Schemas["UserRole"];

// Appointments
export type AppointmentOut = Schemas["AppointmentOut"];
export type AppointmentCreate = Schemas["AppointmentCreate"];
export type AppointmentStatus = Schemas["AppointmentStatus"];
export type AppointmentTransition = Schemas["AppointmentTransition"];
export type CancelRequest = Schemas["CancelRequest"];

// Availability
export type SlotOut = Schemas["SlotOut"];

// Catalog
export type ClinicOut = Schemas["ClinicOut"];
export type ClinicCreate = Schemas["ClinicCreate"];
export type ClinicianOut = Schemas["ClinicianOut"];
export type ClinicianCreate = Schemas["ClinicianCreate"];
export type WorkingWindowOut = Schemas["WorkingWindowOut"];
export type WorkingWindowIn = Schemas["WorkingWindowIn"];
export type ServiceOut = Schemas["ServiceOut"];
export type ServiceCreate = Schemas["ServiceCreate"];

// Cold chain
export type DeviceOut = Schemas["DeviceOut"];
export type DeviceCreate = Schemas["DeviceCreate"];
export type DeviceCredentialOut = Schemas["DeviceCredentialOut"];
export type DeviceStatus = Schemas["DeviceStatus"];
export type DeviceHealthOut = Schemas["DeviceHealthOut"];
export type ExcursionOut = Schemas["ExcursionOut"];
export type ExcursionDirection = Schemas["ExcursionDirection"];
export type TimeSeriesOut = Schemas["TimeSeriesOut"];
export type TimeSeriesPoint = Schemas["TimeSeriesPoint"];
export type ThresholdPolicyOut = Schemas["ThresholdPolicyOut"];
export type ThresholdPolicyCreate = Schemas["ThresholdPolicyCreate"];

// Audit log
export type AuditLogEntryOut = Schemas["AuditLogEntryOut"];

// Pagination
export type PageInfo = Schemas["PageInfo"];
