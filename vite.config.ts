import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: "client",
  css: {
    postcss: path.resolve(__dirname, "client/postcss.config.cjs"),
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src")
    }
  },

  build: {
    outDir: "../dist",
    emptyOutDir: true
  },

  publicDir: "public",

  plugins: [react()]
});
