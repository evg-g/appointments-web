import { useAuth } from "@/auth/useAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ThemeToggle,
} from "@/components/ui";
import { roleLabel } from "@/lib/format";

export function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <>
      <PageHeader title="Settings" description="Your profile and app preferences." />

      <div className="flex max-w-2xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Read-only for now — profile editing is a follow-up (see KNOWN_GAPS).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted">Name</dt>
              <dd className="text-fg">{user?.full_name ?? "—"}</dd>
              <dt className="text-muted">Email</dt>
              <dd className="text-fg">{user?.email ?? "—"}</dd>
              <dt className="text-muted">Role</dt>
              <dd className="text-fg">{user !== null ? roleLabel(user.role) : "—"}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Match your system, or force light or dark.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Sign out of this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onClick={() => void logout()}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
