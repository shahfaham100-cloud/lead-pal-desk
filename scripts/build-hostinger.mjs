import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { packageHostinger } from "./hostinger-package.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const [major, minor] = process.versions.node.split(".").map(Number);
if (!major || major < 22 || (major === 22 && (minor ?? 0) < 12)) {
  throw new Error("Build with Node.js 22.12+; Node.js 22 LTS is recommended.");
}
// A failed build must not leave an old upload folder appearing successful.
await rm(join(root, "hostinger-upload"), { recursive: true, force: true });
await rm(join(root, ".output/hostinger"), { recursive: true, force: true });
const build = spawnSync(process.execPath, [
  join(root, "node_modules/vite/bin/vite.js"), "build", "--config", "vite.hostinger.config.ts",
], { cwd: root, env: process.env, stdio: "inherit" });
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
const files = await packageHostinger(root);
console.log(`\nCreated hostinger-upload with ${files.length} files. ZIP its contents, including output/ and package.json. See HOSTINGER.md.`);