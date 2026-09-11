import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { signOut } from "@/lib/auth.functions";
import type { Role } from "@/lib/session";

export function AppHeader({ role }: { role: Role }) {
  const router = useRouter();
  const doSignOut = useServerFn(signOut);

  return (
    <header className="bg-ink text-ink-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/orders" className="flex items-center gap-3">
          <span className="inline-block size-3 rotate-45 rounded-[2px] bg-primary" />
          <span className="text-lg font-semibold">Workwear Ops</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-ink-foreground/55 sm:inline">
            Production Tracker
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {role === "Admin" && (
            <Link
              to="/admin"
              className="text-sm text-ink-foreground/75 transition-colors hover:text-ink-foreground"
            >
              Admin
            </Link>
          )}
          <span className="hidden text-sm text-ink-foreground/70 sm:inline">
            Signed in — <strong className="font-semibold text-ink-foreground">{role}</strong>
          </span>
          <button
            onClick={async () => {
              await doSignOut({});
              router.navigate({ to: "/", replace: true });
            }}
            className="rounded-md border border-ink-foreground/25 px-3 py-1.5 text-sm transition-colors hover:bg-ink-foreground/10"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
