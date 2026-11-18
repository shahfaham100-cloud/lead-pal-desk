import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getCurrentRole, signIn } from "@/lib/auth.functions";
import logo from "@/assets/dsx-logo.png";
import { ROLES, ROLE_DESCRIPTIONS, type Role } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DSX Printing Services — Order Portal" },
      {
        name: "description",
        content:
          "Track custom printed workwear orders from design approval to delivery. Sign in as a sales agent or admin.",
      },
      { property: "og:title", content: "DSX Printing Services — Order Portal" },
      {
        property: "og:description",
        content: "Track custom printed workwear orders from design approval to delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => {
    const { role } = await getCurrentRole();
    if (role) throw redirect({ to: "/orders" });
    return null;
  },
  component: SignInPage,
});

function SignInPage() {
  const router = useRouter();
  const doSignIn = useServerFn(signIn);
  const [role, setRole] = useState<Role>("Sales Agent");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await doSignIn({ data: { role, passcode } });
    setBusy(false);
    if (result.ok) {
      await router.invalidate();
      router.navigate({ to: "/orders" });
    } else {
      setError("That passcode doesn't match this role.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="panel w-full max-w-2xl p-8">
        <h1>
          <img src={logo} alt="DSX Printing Services" width={800} height={246} className="h-14 w-auto" />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Production tracking for custom printed workwear — design approval to delivery.
        </p>

        <form onSubmit={onSubmit} className="mt-6">
          <p className="label-caps">Sign in as</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {ROLES.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setRole(option)}
                className={`rounded-md border p-4 text-left transition-colors ${
                  role === option
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:border-input"
                }`}
              >
                <span className="block text-sm font-semibold">{option}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {ROLE_DESCRIPTIONS[option]}
                </span>
              </button>
            ))}
          </div>

          <label className="label-caps mt-6 block" htmlFor="passcode">
            Passcode
          </label>
          <input
            id="passcode"
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="Enter passcode"
            className="mt-2 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-md bg-ink px-4 py-3 text-sm font-semibold text-ink-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
