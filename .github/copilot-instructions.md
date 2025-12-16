<!-- .github/copilot-instructions.md - guidance for AI coding agents -->

# Copilot / AI Agent Instructions — my-awsome-portfolio

Purpose: Help an AI coding agent be immediately productive in this VitePress + Tailwind portfolio repository.

- **Project type:** VitePress static site (Vue 3 Single File Components) with a custom theme at `docs/.vitepress/theme/`.
- **Content directory:** `docs/` — Markdown pages and per-work content live under `docs/works/*/index.md`.
- **Dev / Build:** `npx vitepress dev docs` (dev server) and `npx vitepress build docs` → built output in `docs/.vitepress/dist`.

Key files / places to inspect
- `docs/.vitepress/theme/components/WorkStack.vue` — builds the `cards` array from `import.meta.glob` and maps cards → slides for carousel.
- `docs/.vitepress/theme/components/Carousel.vue` — reusable carousel component used by `WorkStack.vue` (props: `slides`, `autoplay`, `interval`, `loop`).
- `docs/works/*/index.md` — source for each “work”; front content and a cover image at `docs/works/<slug>/cover.{jpg,png,webp}` are discovered by glob imports.
- `docs/.vitepress/config.mts` — site base and VitePress configuration (important for `withBase()` usages).
- `README.md` — quick setup and commands (dev, build, serve). Use it for workflow commands.

Important architecture & patterns (do not change without reason)
- VitePress theme + components live under `docs/.vitepress/theme/`. Components are SFCs using `<script setup lang="ts">` and Tailwind utility classes — follow that style.
- Dynamic content is discovered at build/dev time using `import.meta.glob`:
  - Markdown files: used with `{ as: 'raw', eager: true }` to parse headings and excerpts.
  - Images: imported with `eager: true` and `import: 'default'` so the glob values are URLs usable in `<img :src="...">`.
  - Example: in `WorkStack.vue` the code uses `import.meta.glob('../../../works/**/index.md', { as: 'raw', eager: true })` and a separate glob for cover images. Preserve these exact patterns when modifying discovery logic.
- Route creation uses `withBase()` from VitePress to ensure paths match `base` config; prefer using template strings with backticks when interpolating slug: `withBase(`/works/?id=${slug}`)` (avoid single quotes with `${}` inside).

Component conventions
- Use `<script setup lang="ts">` for new components and prefer explicit prop typing via `defineProps<T>()`.
- Tailwind classes are used for layout & responsive sizing; prefer utility-first styling rather than new CSS files unless necessary.
- Components live alongside `WorkStack.vue` and `Carousel.vue` in `docs/.vitepress/theme/components/` — keep imports relative and local to this folder.

Carousel specifics (contract)
- `Carousel.vue` accepts `slides: { title?: string; subtitle?: string; image: string | null; href?: string }[]` and these slides are produced from the cards array in `WorkStack.vue`.
- Optional props: `autoplay?: boolean`, `interval?: number`, `loop?: boolean`.
- Behavior to preserve/expect:
  - Autoplay with pause on hover (component already calls `pauseAutoplay` on `mouseenter`).
  - Previous/Next arrows visible on desktop (`group-hover` used for reveal).
  - Mobile tap areas (left/right thirds) wired to prev/next.
  - Dots indicators that call `goTo(i)`.
  - Slides may optionally have `href` — use `<a>` wrapper to make slide clickable.

Developer workflows & commands
- Dev server: `npx vitepress dev docs` (or `npm run dev` if you add a script). Visit `http://localhost:5173` by default.
- Build: `npx vitepress build docs` → output in `docs/.vitepress/dist`.
- Preview built site locally: `npx vitepress serve docs/.vitepress/dist`.
- Deploy: deploy the built `docs/.vitepress/dist` directory (e.g., gh-pages). See `README.md` for examples.

Project-specific gotchas
- When editing page routes or building links, use `withBase()` so URLs respect the `base` config used for GitHub Pages subpaths.
- The `import.meta.glob` keys are file-system paths relative to the importer. When mapping images, code matches the folder prefix and looks up `imageFiles[imageKey]` — keep that lookup pattern.
- The code often expects `imageFiles[...]` to be the final URL string (because `import: 'default'` was used). If you change glob options, update consuming code.

What to do when adding features
- Preserve the import.glob-based discovery logic (markdown + cover images). If you need additional slide metadata, add frontmatter to `docs/works/*/index.md` and parse it by reading the raw markdown like existing code does.
- Add TypeScript types for any new public props on shared theme components here.
- Keep UI in Tailwind classes and follow the existing responsive breakpoints (sm/md/lg used in components).

If something is unclear
- Open `docs/.vitepress/theme/components/WorkStack.vue` and `Carousel.vue` first — these show the most important patterns (glob imports → cards → slides → UI).
- Ask for clarification before changing how markdown/images are discovered or how `withBase()` is used for routes.

---
If you want, I can (a) fix the minor route string interpolation bug in `WorkStack.vue`, (b) add a unit test harness (no tests currently present), or (c) further annotate the components with stronger TypeScript types. Which would you like next?
