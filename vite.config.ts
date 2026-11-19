// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { loadEnv } from "vite";

// Variáveis de servidor (sem prefixo VITE_) para rotas do servidor.
Object.assign(process.env, loadEnv(process.env["NODE_ENV"] === "production" ? "production" : "development", process.cwd(), ""));

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        { find: "entities/lib/decode.js", replacement: path.resolve(__dirname, "node_modules/entities/lib/decode.js") },
        { find: "entities/lib/encode.js", replacement: path.resolve(__dirname, "node_modules/entities/lib/encode.js") },
        { find: /^entities$/, replacement: path.resolve(__dirname, "node_modules/entities") },
      ],
    },
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        manifest: false, // served from public/manifest.webmanifest
        filename: "sw.js",
        outDir: "dist/client",
        devOptions: { enabled: false },
        workbox: {
          globPatterns: ["**/*.{js,css,png,svg,ico,woff2,webmanifest}"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "paginas",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 50 },
                plugins: [
                  {
                    // Sem internet e sem cópia desta tela: usa outra tela guardada (o app monta a tela certa no aparelho).
                    handlerDidError: async () => {
                      const c = await caches.open("paginas");
                      for (const p of ["/painel", "/boletim/novo", "/programacao", "/historico", "/auth"]) {
                        const r = await c.match(p, { ignoreSearch: true });
                        if (r) return r;
                      }
                      const ks = await c.keys();
                      return ks.length ? (await c.match(ks[0]!)) ?? undefined : undefined;
                    },
                  },
                ],
              },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "fontes" },
            },
          ],
        },
      }),
    ],
  },
});
