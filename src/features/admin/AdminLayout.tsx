import { NavLink, Outlet } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/cn";

const TABS = [
  { to: "/admin/clinics", label: "Clinics" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/clinicians", label: "Clinicians" },
  { to: "/admin/audit", label: "Audit log" },
] as const;

export function AdminLayout() {
  return (
    <>
      <PageHeader
        title="Admin"
        description="Manage clinics, services, clinicians, and review the audit log."
      />
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-line" aria-label="Admin sections">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-fg",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
}
