import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    // 0.0.0.0 so the dev server is reachable from a phone on the same Wi-Fi,
    // which is how the scanner gets tested with a real camera.
    host: "0.0.0.0",
    port: 5173,
  },
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
  build: { outDir: "build" },
});
