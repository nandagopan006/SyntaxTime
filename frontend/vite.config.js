import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Other projects on this machine already use 5173-5175.
    // strictPort makes Vite fail instead of quietly switching ports.
    port: 5180,
    strictPort: true,
  },
});
