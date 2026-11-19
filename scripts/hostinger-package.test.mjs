import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { packageHostinger } from "./hostinger-package.mjs";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "hostinger-package-"));
  for (const dir of [".output/hostinger/server", ".output/hostinger/public", "scripts"]) {
    await mkdir(join(root, dir), { recursive: true });
  }
  for (const [path, content] of [
    [".output/hostinger/server/index.mjs", "export default {};"],
    [".output/hostinger/public/app.js", "console.log('app');"],
    [".output/hostinger/public/app.js.map", "{}"],
    ["scripts/hostinger-start.mjs", "await import('./output/server/index.mjs');"],
    ["HOSTINGER.md", "Instructions"], ["hostinger.env.example", "SESSION_SECRET=\n"],
    [".env", "DO_NOT_SHIP=private"],
  ]) await writeFile(join(root, path), content);
  return root;
}

test("creates hostinger-upload with deployable server and public assets", async () => {
  const root = await fixture();
  try {
    const files = await packageHostinger(root);
    assert.deepEqual(files, ["HOSTINGER.md", "output/public/app.js", "output/server/index.mjs", "package-lock.json", "package.json", "server.js", "settings.example"]);
    const manifest = JSON.parse(await readFile(join(root, "hostinger-upload/package.json"), "utf8"));
    assert.equal(manifest.scripts.start, "node server.js");
    assert.equal(manifest.type, "module");
    assert.equal(manifest.dependencies, undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("refuses secret environment files in output", async () => {
  const root = await fixture();
  try {
    await writeFile(join(root, ".output/hostinger/server/.env"), "PRIVATE=value");
    await assert.rejects(packageHostinger(root), /Unsafe or unbundled output: server\/\.env/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("refuses output requiring local node_modules", async () => {
  const root = await fixture();
  try {
    await mkdir(join(root, ".output/hostinger/server/node_modules"));
    await writeFile(join(root, ".output/hostinger/server/node_modules/package.js"), "export {};" );
    await assert.rejects(packageHostinger(root), /Unsafe or unbundled output/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("startup requires all backend and role settings", () => {
  const start = fileURLToPath(new URL("./hostinger-start.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [start], { env: {}, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing runtime settings: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DB_ACCESS_TOKEN, SESSION_SECRET, SALES_PASSCODE, VENDOR_PASSCODE, ADMIN_PASSCODE/);
});

test("startup rejects session secrets shorter than 32 characters", () => {
  const start = fileURLToPath(new URL("./hostinger-start.mjs", import.meta.url));
  const env = Object.fromEntries([
    "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "DB_ACCESS_TOKEN",
    "SESSION_SECRET", "SALES_PASSCODE", "VENDOR_PASSCODE", "ADMIN_PASSCODE",
  ].map((key) => [key, "test-only-value"]));
  const result = spawnSync(process.execPath, [start], { env, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SESSION_SECRET must contain at least 32 characters/);
});

test("packaged entry starts from an extracted upload directory and preserves Hostinger PORT", async () => {
  const root = await fixture();
  try {
    const start = fileURLToPath(new URL("./hostinger-start.mjs", import.meta.url));
    await writeFile(join(root, "scripts/hostinger-start.mjs"), await readFile(start));
    // A stand-in compiled entry verifies packaging/startup, not the app's production build.
    await writeFile(join(root, ".output/hostinger/server/index.mjs"), `
      import assert from 'node:assert/strict';
      assert.equal(process.env.NODE_ENV, 'production');
      assert.equal(process.env.NITRO_HOST, '0.0.0.0');
      assert.equal(process.env.PORT, '43217');
      console.log('packaged entry loaded');
    `);
    await packageHostinger(root);
    const upload = join(root, "hostinger-upload");
    const env = Object.fromEntries([
      "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "DB_ACCESS_TOKEN",
      "SALES_PASSCODE", "VENDOR_PASSCODE", "ADMIN_PASSCODE",
    ].map((key) => [key, "test-only-value"]));
    const result = spawnSync(process.execPath, [join(upload, "server.js")], {
      cwd: tmpdir(),
      env: { ...env, SESSION_SECRET: "x".repeat(32), PORT: "43217" },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /packaged entry loaded/);
    // Execute the exact uploaded package's build check after installation would finish.
    const check = spawnSync(process.execPath, ["-e", "require('node:fs').accessSync('output/server/index.mjs')"], {
      cwd: upload, encoding: "utf8",
    });
    assert.equal(check.status, 0, check.stderr);
  } finally { await rm(root, { recursive: true, force: true }); }
});