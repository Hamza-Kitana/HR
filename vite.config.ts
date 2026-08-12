import path from "node:path";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  envPrefix: ["VITE_"],
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro(),
    viteReact(),
    tailwindcss(),
  ],
});
