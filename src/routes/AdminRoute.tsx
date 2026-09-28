import { Settings2 } from "lucide-react";

import { ComingSoon } from "./ComingSoon";

export function AdminRoute() {
  return (
    <ComingSoon
      title="Admin"
      description="Clinics, clinicians, services, the audit log, and settings."
      milestone={13}
      icon={Settings2}
    />
  );
}
