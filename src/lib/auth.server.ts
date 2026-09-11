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
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] !== "development",
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function expectedPasscode(role: Role): string | undefined {
  if (role === "Admin") return process.env["ADMIN_PASSCODE"];
  if (role === "Vendor") return process.env["VENDOR_PASSCODE"];
  return process.env["SALES_PASSCODE"];
}

export async function readRole(): Promise<Role | null> {
  const session = await useSession<GateSession>(sessionConfig());
  const role = session.data.role;
  return role && ROLES.includes(role) ? role : null;
}

export async function setRole(role: Role): Promise<void> {
  const session = await useSession<GateSession>(sessionConfig());
  await session.update({ role });
}

export async function clearRole(): Promise<void> {
  const session = await useSession<GateSession>(sessionConfig());
  await session.clear();
}

export async function requireRole(allowed?: Role[]): Promise<Role> {
  const role = await readRole();
  if (!role) throw redirect({ to: "/" });
  if (allowed && !allowed.includes(role)) throw redirect({ to: "/orders" });
  return role;
}
