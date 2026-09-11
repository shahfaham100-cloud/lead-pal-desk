import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";
import { ROLES, type Role } from "./session";

type GateSession = { role?: Role };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "workwear-ops",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

function expectedPasscode(role: Role): string | undefined {
  return role === "Admin" ? process.env["ADMIN_PASSCODE"] : process.env["SALES_PASSCODE"];
}

export async function readRole(): Promise<Role | null> {
  const session = await useSession<GateSession>(sessionConfig());
  const role = session.data.role;
  return role && ROLES.includes(role) ? role : null;
}

export async function requireRole(allowed?: Role[]): Promise<Role> {
  const role = await readRole();
  if (!role) throw redirect({ to: "/" });
  if (allowed && !allowed.includes(role)) throw redirect({ to: "/orders" });
  return role;
}

export const getCurrentRole = createServerFn({ method: "GET" }).handler(async () => {
  return { role: await readRole() };
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((data: { role: Role; passcode: string }) => {
    if (!ROLES.includes(data.role)) throw new Error("Unknown role");
    return { role: data.role, passcode: String(data.passcode ?? "") };
  })
  .handler(async ({ data }) => {
    const expected = expectedPasscode(data.role);
    if (!expected) throw new Error("Passcodes are not configured");
    if (!data.passcode || !matches(data.passcode, expected)) {
      return { ok: false as const };
    }
    const session = await useSession<GateSession>(sessionConfig());
    await session.update({ role: data.role });
    return { ok: true as const };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});
