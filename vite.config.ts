import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// --- Fix ESM: Replace __dirname/__filename with this: ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Add your actual Replit hostname(s) below: ---
const allowedHosts = [
  "87050313-e668-43f1-8990-61484cda16f6-00-26onqyjlfe22j.worf.replit.dev"
];

// --- Main Export: ---
export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // If you want Replit's Cartographer in dev mode:
    // ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID
    //   ? [
    //       (await import("@replit/vite-plugin-cartographer")).cartographer(),
    //     ]
    //   : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    allowedHosts,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true
      }
    }
  },
});