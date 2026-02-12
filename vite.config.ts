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
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (/[/\\]react-dom[/\\]/.test(id) || /[/\\]react[/\\]/.test(id)) return "vendor-react";
            if (id.includes("date-fns")) return "vendor-date";
          }
        },
      },
    },
  },

  publicDir: "public",

  plugins: [react()]
});
