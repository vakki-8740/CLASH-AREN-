import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
    base: mode === "development" ? "/" : "/CLASH-AREN-/",
    plugins: [react()],
    css: {
        transformer: "postcss"
    },
    build: {
        cssMinify: false
    },
    server: {
        host: "0.0.0.0"
    }
}));
