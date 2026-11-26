import { defineConfig, mergeConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import viteConfig from "./vite.config.js";

export default mergeConfig(
    viteConfig({ mode: "test" }),
    defineConfig({
        test: {
            projects: [
                {
                    extends: true,
                    test: {
                        name: "unit",
                        include: ["src/**/*.test.js"],
                        exclude: ["src/**/*.browser.test.js"],
                    },
                },
                {
                    extends: true,
                    test: {
                        name: "browser",
                        include: ["src/**/*.browser.test.js"],
                        browser: {
                            enabled: true,
                            headless: true,
                            provider: playwright(),
                            instances: [{ browser: "chromium" }],
                        },
                    },
                },
            ],
        },
    }),
);
