import { CalendarDays } from "lucide-react";

import { ComingSoon } from "./ComingSoon";

export function AppointmentsRoute() {
  return (
    <ComingSoon
      title="Appointments"
      description="Calendar, booking flow, and appointment detail."
      milestone={13}
      icon={CalendarDays}
    />
  );
}
