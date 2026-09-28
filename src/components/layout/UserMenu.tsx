import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { User } from "@/auth/auth-context";
import { useAuth } from "@/auth/useAuth";
import { Badge } from "@/components/ui";
import { initials, roleLabel } from "@/lib/format";

const CONTENT_CLASS = "z-[900] min-w-56 rounded-lg border border-line bg-raised p-1 shadow-lg";
const ITEM_CLASS =
  "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-fg outline-none " +
  "data-[highlighted]:bg-sunken";

/** The account menu in the header: shows who is signed in and offers sign-out. */
export function UserMenu({ user }: { user: User }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut(): Promise<void> {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2 text-sm text-fg transition-colors hover:bg-sunken"
        >
          <span
            className="flex size-7 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent-subtle-fg"
            aria-hidden="true"
          >
            {initials(user.full_name)}
          </span>
          <span className="hidden max-w-32 truncate sm:inline">{user.full_name}</span>
          <ChevronDown className="size-4 text-muted" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={CONTENT_CLASS}>
          <div className="flex flex-col gap-1 px-2.5 py-2">
            <p className="truncate text-sm font-medium text-fg">{user.full_name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <Badge variant="accent" className="mt-1 self-start">
              {roleLabel(user.role)}
            </Badge>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={ITEM_CLASS} onSelect={() => void handleSignOut()}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
