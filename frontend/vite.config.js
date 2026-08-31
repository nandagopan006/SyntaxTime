import { resolve } from "node:path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Two pages, not one. The desktop focus window is a separate window with
      // a separate webview, and giving it its own entry means the packaged
      // application has a real file to load rather than relying on a
      // single-page fallback the Tauri asset protocol does not provide.
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        focusWindow: resolve(import.meta.dirname, "focus-window.html"),
      },
      output: {
        // Recharts is by far the largest thing here and only the Home chart
        // uses it. Splitting it out keeps it out of the focus window's bundle
        // entirely, and means editing application code does not invalidate a
        // cached copy of a library that has not changed.
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts";
          }
          if (id.includes("react-dom") || id.includes("react-router")) {
            return "react";
          }
          if (id.includes("redux")) {
            return "redux";
          }
          return undefined;
        },
      },
    },
  },
  // Tauri prints its own compile progress; letting Vite wipe the screen would
  // hide it.
  clearScreen: false,
  server: {
    // Other projects on this machine already use 5173-5175.
    // strictPort makes Vite fail instead of quietly switching ports.
    port: 5180,
    strictPort: true,
    watch: {
      // The Rust build output lives inside this directory, and cargo holds
      // locks on the files it is writing. Without this, Vite's watcher opens
      // a half-written .exe, throws EBUSY, and takes the dev server down in
      // the middle of every Rust compile.
      ignored: ["**/src-tauri/**"],
    },
  },
});
