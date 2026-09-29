import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { RequireRole } from "@/auth/RequireRole";
import type { UserRole } from "@/auth/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginRoute } from "@/routes/LoginRoute";
import { NotFoundRoute } from "@/routes/NotFoundRoute";

// Feature pages are split into their own chunks (ADR 0006, web): the login shell and the app frame
// load first, and each authenticated page's code — with its heavy dependencies (the temperature
// chart, the booking forms, the admin tables) — is fetched on demand. The Suspense boundaries that
// cover these live in AppLayout and AdminLayout. A named export is adapted to the default React.lazy
// expects.
const DashboardRoute = lazy(() =>
  import("@/routes/DashboardRoute").then((m) => ({ default: m.DashboardRoute })),
);
const AppointmentsRoute = lazy(() =>
  import("@/routes/AppointmentsRoute").then((m) => ({ default: m.AppointmentsRoute })),
);
const BookingRoute = lazy(() =>
  import("@/routes/BookingRoute").then((m) => ({ default: m.BookingRoute })),
);
const AppointmentDetailRoute = lazy(() =>
  import("@/routes/AppointmentDetailRoute").then((m) => ({ default: m.AppointmentDetailRoute })),
);
const CalendarRoute = lazy(() =>
  import("@/routes/CalendarRoute").then((m) => ({ default: m.CalendarRoute })),
);
const ColdChainRoute = lazy(() =>
  import("@/routes/ColdChainRoute").then((m) => ({ default: m.ColdChainRoute })),
);
const SettingsRoute = lazy(() =>
  import("@/routes/SettingsRoute").then((m) => ({ default: m.SettingsRoute })),
);
const AdminRoute = lazy(() =>
  import("@/routes/AdminRoute").then((m) => ({ default: m.AdminRoute })),
);
const ClinicsAdmin = lazy(() =>
  import("@/features/admin/ClinicsAdmin").then((m) => ({ default: m.ClinicsAdmin })),
);
const ServicesAdmin = lazy(() =>
  import("@/features/admin/ServicesAdmin").then((m) => ({ default: m.ServicesAdmin })),
);
const CliniciansAdmin = lazy(() =>
  import("@/features/admin/CliniciansAdmin").then((m) => ({ default: m.CliniciansAdmin })),
);
const AuditLog = lazy(() =>
  import("@/features/admin/AuditLog").then((m) => ({ default: m.AuditLog })),
);

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

// BASE_URL is "/" normally and "/appointments-web/" in the GitHub Pages build (vite --base).
export const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
});
