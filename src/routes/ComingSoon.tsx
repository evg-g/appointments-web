import { Hammer } from "lucide-react";
import type { ComponentType } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui";

export interface ComingSoonProps {
  title: string;
  description: string;
  milestone: number;
  icon?: ComponentType<{ className?: string }>;
}

/** Placeholder for a feature page the foundation reserves a route for but does not build yet. */
export function ComingSoon({ title, description, milestone, icon = Hammer }: ComingSoonProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title={`Arriving in milestone ${String(milestone)}`}
        description="This route is wired up; the feature is built next."
      />
    </>
  );
}
