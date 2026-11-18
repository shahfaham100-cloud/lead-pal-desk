import { cp, mkdir, readdir, rm, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

export async function listFiles(dir, prefix = "") {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Deployment output contains a symlink: ${relative}`);
    if (entry.isDirectory()) files.push(...await listFiles(join(dir, entry.name), relative));
    else files.push(relative);
  }
  return files.sort();
}

export async function packageHostinger(root) {
  const output = join(root, ".output/hostinger");
  await access(join(output, "server/index.mjs"));
  await access(join(output, "public"));
  const files = await listFiles(output);
  const forbidden = files.find((file) => file.split("/").some((part) =>
    part === "node_modules" || part === ".git" || part === ".env" || part.startsWith(".env.")));
  if (forbidden) throw new Error(`Unsafe or unbundled output: ${forbidden}`);
  const upload = join(root, "hostinger-upload");
  await rm(upload, { recursive: true, force: true });
  await mkdir(join(upload, "output"), { recursive: true });
  for (const name of ["server", "public"]) {
    await cp(join(output, name), join(upload, "output", name), {
      recursive: true, filter: (path) => !path.endsWith(".map"),
    });
  }
  await cp(join(root, "scripts/hostinger-start.mjs"), join(upload, "server.js"));
  await cp(join(root, "HOSTINGER.md"), join(upload, "HOSTINGER.md"));
  await cp(join(root, "hostinger.env.example"), join(upload, "settings.example"));
  const manifest = {
    name: "workwear-ops-hostinger", version: "1.0.0", private: true, type: "module",
    engines: { node: ">=22.12.0 <23 || >=24.0.0 <25" },
    scripts: {
      start: "node server.js",
      build: "node -e \"require('node:fs').accessSync('output/server/index.mjs'); console.log('Prebuilt Hostinger package ready')\"",
    },
  };
  await writeFile(join(upload, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(upload, "package-lock.json"), `${JSON.stringify({
    name: manifest.name, version: manifest.version, lockfileVersion: 3, requires: true,
    packages: { "": { name: manifest.name, version: manifest.version, engines: manifest.engines } },
  }, null, 2)}\n`);
  return listFiles(upload);
}