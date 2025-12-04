import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/",   // <---- FIXES STATIC ASSET 404 ON RENDER
  plugins: [
    react(),
    tailwindcss(),
  ],
});
