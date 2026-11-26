import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// The site builds to dist/ for GitHub Pages at /traitors/. The Nova builds
// add one self-contained file per game that Rocketcrab downloads:
// dist/game.html for Sabotage and dist/game-banishment.html for Banishment.
const NOVA_GAMES = {
    nova: "game.html",
    "nova-banishment": "game-banishment.html",
};

export default defineConfig(({ mode }) => {
    const nova = mode in NOVA_GAMES;
    return {
        base: "/traitors/",
        plugins: [react(), tailwindcss(), ...(nova ? [viteSingleFile()] : [])],
        build: {
            emptyOutDir: !nova,
            copyPublicDir: !nova,
            rolldownOptions: {
                input: nova
                    ? NOVA_GAMES[mode]
                    : [
                          "index.html",
                          "how-to-play.html",
                          "the-resistance-online.html",
                          "demo.html",
                          "banishment.html",
                      ],
            },
        },
    };
});
