import { defineConfig } from "vite";

export default defineConfig({
  base: "/app/",
  root: ".",
  build: {
    outDir: "../public/app",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
