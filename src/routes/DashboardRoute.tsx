import { CalendarPlus, Thermometer } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/auth/useAuth";
import { RoleGate } from "@/auth/RoleGate";
import { Button, EmptyState, SimpleCard } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";

/**
 * Foundation dashboard. The real widgets (upcoming appointments, live cold-chain tiles) land in
 * milestone 13; today it demonstrates the four-state primitives with designed empty states that
 * each offer a next action.
 */
export function DashboardRoute() {
  const { user } = useAuth();
  const firstName = user?.full_name.split(" ")[0] ?? "there";

  return (
    <>
      <PageHeader title={`Welcome, ${firstName}`} description="Here is what is happening today." />

      <div className="grid gap-4 md:grid-cols-2">
        <SimpleCard title="Upcoming appointments">
          <EmptyState
            title="No appointments yet"
            description="Booking arrives in the next milestone."
            action={
              <Button asChild size="sm">
                <Link to="/appointments">
                  <CalendarPlus className="size-4" aria-hidden="true" />
                  Go to appointments
                </Link>
              </Button>
            }
          />
        </SimpleCard>

        <RoleGate
          allow={["CLINICIAN", "CLINIC_ADMIN", "PLATFORM_ADMIN"]}
          fallback={
            <SimpleCard title="Your care team">
              <EmptyState
                title="Nothing to show"
                description="Your clinic updates will appear here."
              />
            </SimpleCard>
          }
        >
          <SimpleCard title="Cold-chain status">
            <EmptyState
              icon={Thermometer}
              title="No devices connected"
              description="Live fridge monitoring arrives in the next milestone."
              action={
                <Button asChild size="sm" variant="secondary">
                  <Link to="/cold-chain">Open cold chain</Link>
                </Button>
              }
            />
          </SimpleCard>
        </RoleGate>
      </div>
    </>
  );
}
