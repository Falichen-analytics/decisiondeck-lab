import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => ({
  base:
    command === "serve" && mode === "development"
      ? "/"
      : "/decisiondeck-lab/",
  plugins: [react()],
  build: {
    target: "es2022",
  },
}));
