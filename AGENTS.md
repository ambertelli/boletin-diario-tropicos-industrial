<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Offline: vite-plugin-pwa (generateSW, outDir dist/client) registered only via src/lib/pwa.ts; boletim writes go through the IndexedDB queue in src/lib/fila.ts + src/lib/sync.ts when offline. Why: shop floor loses internet; preview must never get a service worker.
