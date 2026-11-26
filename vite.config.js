import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// The site builds to dist/ for GitHub Pages at /traitors/. The Nova build
// adds dist/game.html: one self-contained file that Rocketcrab downloads.
export default defineConfig(({ mode }) => {
    const nova = mode === "nova";
    return {
        base: "/traitors/",
        plugins: [react(), ...(nova ? [viteSingleFile()] : [])],
        build: {
            emptyOutDir: !nova,
            copyPublicDir: !nova,
            rolldownOptions: {
                input: nova ? "game.html" : ["game.html"],
            },
        },
    };
});
