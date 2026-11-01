// Separate client-only build for Capacitor: TanStack Start output is SSR and has no index.html.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "static-app",
  base: "./",
  publicDir: "../public",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: "../dist-static", emptyOutDir: true },
});