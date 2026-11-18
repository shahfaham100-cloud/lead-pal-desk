import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Lovable's configuration intentionally pins the Worker preset in its sandbox.
export default defineConfig({
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({ server: { entry: "server" } }),
    react(),
    tailwindcss(),
    nitro({
      preset: "node-server",
      noExternals: true,
      serveStatic: true,
      output: {
        dir: ".output/hostinger",
        serverDir: ".output/hostinger/server",
        publicDir: ".output/hostinger/public",
      },
    }),
  ],
});