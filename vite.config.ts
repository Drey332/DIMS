import { defineConfig, type PluginOption, type UserConfig, type LogLevel } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const configPromise = (async () => {
  const plugins: PluginOption[] = [react()];

  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID) {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    plugins.push(cartographer());
  }

  const config: UserConfig = {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      hmr: { overlay: false },
    },
    clearScreen: false,
    logLevel: "info",
    optimizeDeps: {
      esbuildOptions: {
        logOverride: {
          "this-is-undefined-in-esm": "silent",
        } satisfies Record<string, LogLevel>,
      },
    },
  };

  return config;
})();

export default defineConfig(configPromise);
