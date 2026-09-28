import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

import { Button, EmptyState } from "@/components/ui";

export function NotFoundRoute() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={
          <Button asChild size="sm">
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
