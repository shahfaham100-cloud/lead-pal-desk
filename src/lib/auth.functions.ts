import { createServerFn } from "@tanstack/react-start";
import { ROLES, type Role } from "./session";

export const getCurrentRole = createServerFn({ method: "GET" }).handler(async () => {
  const { readRole } = await import("./auth.server");
  return { role: await readRole() };
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((data: { role: Role; passcode: string }) => {
    if (!ROLES.includes(data.role)) throw new Error("Unknown role");
    return { role: data.role, passcode: String(data.passcode ?? "") };
  })
  .handler(async ({ data }) => {
    const { expectedPasscode, matches, setRole } = await import("./auth.server");
    const expected = expectedPasscode(data.role);
    if (!expected) throw new Error("Passcodes are not configured");
    if (!data.passcode || !matches(data.passcode, expected)) {
      return { ok: false as const };
    }
    await setRole(data.role);
    return { ok: true as const };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { clearRole } = await import("./auth.server");
  await clearRole();
  return { ok: true as const };
});
