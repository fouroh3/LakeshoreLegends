import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const APPS_SCRIPT_PATH =
  "/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/ll-api": {
        target: "https://script.google.com",
        changeOrigin: true,
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/ll-api/, APPS_SCRIPT_PATH),
      },
    },
  },
});
