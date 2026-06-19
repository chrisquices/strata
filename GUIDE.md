## Project Overview

A Vue UI kit — 80+ components and headless engines for color, dates, media, drag-and-drop, virtualization, and more.

- **Primitives (`/deps/strata/ui`):** 80+ foundational, reusable UI components designed for use across projects.
- **Blocks (`/src/components/blocks`):** Generic, reusable components composed from primitives to provide complete interface patterns.
- **App (`/src/components/app`):** Project-specific compositions similar to blocks, but designed exclusively for this application and not intended for reuse elsewhere.
- **Headless Engines:** Presentation-independent APIs that provide complex behavior for building specialized components and workflows.

## Offline Vue Build Pipeline

The vendored build pipeline compiles the Vue source into self-contained static output, with no global installations, CDNs, package registries, or `node_modules`.

- Uses the vendored Bun binary, Vue runtime, and Vue SFC compiler inside `/deps`.
- Uses `/src/index.html` and `/src/main.ts` as application entrypoints.
- Compiles `.vue` scripts, templates, and styles.
- Resolves Vue imports to the vendored runtime.
- Bundles and inlines application JavaScript and Vue SFC styles.
- Compiles `/src/app.css` with the vendored Tailwind v4 standalone binary.
- Produces a self-contained `/docs/index.html` with inlined JavaScript and CSS, which runs directly in modern browsers without a server or internet connection.

## Running the Project

1. From the project root, run:

   ```sh
   ./deps/build/cli-bun deps/build/runner-build.ts
   ```

## Running the Project (For Developing)

Use the development server while actively changing the project. It watches the application source, rebuilds automatically, and refreshes connected browsers after successful builds.

1. From the project root, run:

   ```sh
   ./deps/build/cli-bun deps/build/runner-dev.ts
   ```

2. Open `http://localhost:3000/` in a browser. Agents (LLMs) should use port 3320 instead. The user is using port 3000.
4. Stop the development server with `Ctrl+C`.

Development mode performs full-page live reloads rather than state-preserving Vue hot module replacement.

## General Rules

1. Never modify, add to, delete, rename, move, or replace this GUIDE.md file unless the user explicitly instructs you to do so.
3. Follow the user's requested names, packages, files, tools, and actions exactly. If a requested item is unavailable, ambiguous, appears incorrect, or differs from a preferred alternative, stop immediately without making changes or substitutions, report the discrepancy, and wait for the user to provide the next step. Never substitute an alternative item without explicit permission.
5. Project infrastructure is frozen without explicit user permission. Never add, install, vendor, update, edit, delete, rename, or replace dependencies, libraries, packages, configuration files, or any top-level or otherwise important file or folder (e.g., `deps/`, `tsconfig.json`, the build scripts in `deps/build/`) unless the user explicitly permits or instructs that specific change. If a task requires something that is missing — for example, a component being ported imports a library that is not vendored in `deps/` — stop immediately, report exactly what is missing, and wait for the user. Do not attempt to obtain, vendor, shim, stub, or otherwise work around the missing item. (Running the documented build and dev commands, including their output to `docs/`, is normal operation, not an infrastructure change.)
6. Testing happens only on the user's explicit instruction — their instruction is the sole trigger. Unprompted, never write tests or verification code: no test files, no one-off test or verification scripts, no debug harnesses or temporary scaffolds, not even to check your own work with the intent to delete afterward. If a check seems needed and none was requested, note it in your report and stop. When the user explicitly instructs testing (e.g., "test it"), run any tests that already exist, and create temporary tests where none exist — run them, report the results, then delete the temporary ones so they leave no trace in the project. (Running the documented build remains normal operation at any time and needs no test instruction.)

## When working with components in general

1. SFCs are written `lang="ts"`, but the build transpiles via Bun with no type-checking — types are documentation only; runtime correctness is what's enforced. Don't rely on the build to catch type errors.
2. Props use the `String as PropType<'a' | 'b'>` cast plus an inline `validator` (e.g. `validator: (v) => ['sm','md','lg'].includes(v)`). Match this idiom for every enum prop.
3. Date/time components take an ISO-string `v-model` — `"2026-06-14"` (single) or `{ start, end }` (range) — converted to/from `@internationalized/date` objects in `deps/strata/ui/Shared/date.ts`. Reuse those converters; never expose raw `Date`/`DateValue`.
4. For components built on a calendar/field primitive, `placeholder` (the visible month, or visible time for `TimeField`) must stay a writable `ref` synced to the value with a `watch`, never a `computed` — it's bound to `v-model:placeholder`, so a `computed` breaks prev/next navigation.

## When working with reka-ui

1. reka-ui is the source of truth: wrap its primitives, don't reinvent them. When a wrapper's behavior would diverge from reka, match reka.
2. reka already provides accessibility you might think is missing — it labels calendar nav buttons ("Previous/Next page") and field segments (`role="spinbutton"`), and spreads `$attrs` / sets `data-*` on its root. Verify in the live DOM before adding or flagging a11y attributes. (It does not label your own icon-only triggers — those you must label.)
3. A slot's scope from `v-slot="s"` is only available inside the slot content, not on the component's own `:class`. To style by slot state, render the element with `as-child` and read the scope on that inner element.
