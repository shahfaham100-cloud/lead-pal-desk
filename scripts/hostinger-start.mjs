// Hostinger injects settings at runtime; no secrets belong in the uploaded ZIP.
// Hostinger's LiteSpeed runner loads this file with require(), so it must not
// use top-level await; the server is started with a dynamic import() instead.
const required = [
  "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "SESSION_SECRET", "SALES_PASSCODE", "VENDOR_PASSCODE", "ADMIN_PASSCODE",
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(`Missing runtime settings: ${missing.join(", ")}. Add them in Hostinger's Environment variables and redeploy. See HOSTINGER.md.`);
}
if ((process.env.SESSION_SECRET?.length ?? 0) < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
}
process.env.NODE_ENV = "production";
process.env.NITRO_HOST = "0.0.0.0";
// Nitro reads Hostinger's PORT automatically.
import("./output/server/index.mjs").catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
