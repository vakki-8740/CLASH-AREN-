import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
    const rootHost = process.env.VITE_BASE || process.env.NETLIFY || process.env.VERCEL;
    return {
        base: mode === "development" ? "/" : (rootHost ? "/" : "/CLASH-AREN-/"),
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
    };
});
