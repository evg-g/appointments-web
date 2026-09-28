import { createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { RequireRole } from "@/auth/RequireRole";
import type { UserRole } from "@/auth/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute } from "@/routes/AdminRoute";
import { AppointmentsRoute } from "@/routes/AppointmentsRoute";
import { ColdChainRoute } from "@/routes/ColdChainRoute";
import { DashboardRoute } from "@/routes/DashboardRoute";
import { LoginRoute } from "@/routes/LoginRoute";
import { NotFoundRoute } from "@/routes/NotFoundRoute";

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
          {
            element: <RequireRole allow={STAFF} />,
            children: [{ path: "cold-chain", element: <ColdChainRoute /> }],
          },
          {
            element: <RequireRole allow={ADMINS} />,
            children: [{ path: "admin", element: <AdminRoute /> }],
          },
          { path: "*", element: <NotFoundRoute /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
