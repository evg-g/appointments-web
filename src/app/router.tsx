import { createBrowserRouter, Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { RequireRole } from "@/auth/RequireRole";
import type { UserRole } from "@/auth/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuditLog } from "@/features/admin/AuditLog";
import { CliniciansAdmin } from "@/features/admin/CliniciansAdmin";
import { ClinicsAdmin } from "@/features/admin/ClinicsAdmin";
import { ServicesAdmin } from "@/features/admin/ServicesAdmin";
import { AdminRoute } from "@/routes/AdminRoute";
import { AppointmentDetailRoute } from "@/routes/AppointmentDetailRoute";
import { AppointmentsRoute } from "@/routes/AppointmentsRoute";
import { BookingRoute } from "@/routes/BookingRoute";
import { CalendarRoute } from "@/routes/CalendarRoute";
import { ColdChainRoute } from "@/routes/ColdChainRoute";
import { DashboardRoute } from "@/routes/DashboardRoute";
import { LoginRoute } from "@/routes/LoginRoute";
import { NotFoundRoute } from "@/routes/NotFoundRoute";
import { SettingsRoute } from "@/routes/SettingsRoute";

const STAFF: readonly UserRole[] = ["CLINICIAN", "CLINIC_ADMIN", "PLATFORM_ADMIN"];
const ADMINS: readonly UserRole[] = ["CLINIC_ADMIN", "PLATFORM_ADMIN"];

export const routes: RouteObject[] = [
  { path: "/login", element: <LoginRoute /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardRoute /> },
          { path: "appointments", element: <AppointmentsRoute /> },
          { path: "appointments/new", element: <BookingRoute /> },
          { path: "appointments/:appointmentId", element: <AppointmentDetailRoute /> },
          { path: "calendar", element: <CalendarRoute /> },
          { path: "settings", element: <SettingsRoute /> },
          {
            element: <RequireRole allow={STAFF} />,
            children: [{ path: "cold-chain", element: <ColdChainRoute /> }],
          },
          {
            element: <RequireRole allow={ADMINS} />,
            children: [
              {
                path: "admin",
                element: <AdminRoute />,
                children: [
                  { index: true, element: <Navigate to="/admin/clinics" replace /> },
                  { path: "clinics", element: <ClinicsAdmin /> },
                  { path: "services", element: <ServicesAdmin /> },
                  { path: "clinicians", element: <CliniciansAdmin /> },
                  { path: "audit", element: <AuditLog /> },
                ],
              },
            ],
          },
          { path: "*", element: <NotFoundRoute /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
