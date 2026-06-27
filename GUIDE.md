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
7. A comment should always have an empty line above it unless the line above is a continuation of the same comment, another comment, or the comment is the first thing in the file on line 1.
8. Do not use arrow functions. Use function declarations or regular function expressions instead.
9. Put the actual content of a component, tag, function call, expression, or statement on its own line when it is not empty. Do not hand-wrap continuous content across multiple lines; write it continuously on that line and let the user's editor wrap it.

## When working with components in general

1. SFCs are written `lang="ts"`, but the build transpiles via Bun with no type-checking — types are documentation only; runtime correctness is what's enforced. Don't rely on the build to catch type errors.
2. Props use the `String as PropType<'a' | 'b'>` cast plus an inline `validator` (e.g. `validator: function (value) { return ['sm','md','lg'].includes(value); }`). Match this idiom for every enum prop.
3. Date/time components take an ISO-string `v-model` — `"2026-06-14"` (single) or `{ start, end }` (range) — converted to/from `@internationalized/date` objects in `deps/strata/ui/Shared/date.ts`. Reuse those converters; never expose raw `Date`/`DateValue`.
4. For components built on a calendar/field primitive, `placeholder` (the visible month, or visible time for `TimeField`) must stay a writable `ref` synced to the value with a `watch`, never a `computed` — it's bound to `v-model:placeholder`, so a `computed` breaks prev/next navigation.

## When working with reka-ui

1. reka-ui is the source of truth: wrap its primitives, don't reinvent them. When a wrapper's behavior would diverge from reka, match reka.
2. reka already provides accessibility you might think is missing — it labels calendar nav buttons ("Previous/Next page") and field segments (`role="spinbutton"`), and spreads `$attrs` / sets `data-*` on its root. Verify in the live DOM before adding or flagging a11y attributes. (It does not label your own icon-only triggers — those you must label.)
3. A slot's scope from `v-slot="s"` is only available inside the slot content, not on the component's own `:class`. To style by slot state, render the element with `as-child` and read the scope on that inner element.

## Component page and API conventions

1. Component pages should follow the same structure as `src/pages/components/Accordion.vue`.
2. Page headers should use `<!-- Header -->` before `ComponentItemHeader`, `<!-- Title -->` before `ComponentItemHeaderTitle`, and `<!-- Description -->` before `ComponentItemHeaderDescription`.
3. Add exactly one comment before each `ComponentItemSection`, naming the section (for example, `<!-- Controlled -->`). Do not add comments for every child inside a section.
4. Do not wrap component page sections in an extra layout div such as `<div class="flex flex-col gap-14">`. Let `ComponentItemSection` blocks sit directly under `ComponentLayout`.
5. Remove `data-demo` attributes and wrappers from component pages unless explicitly needed.
6. Every `ComponentItemSection` must contain a `ComponentItemSectionTitle`, a `ComponentItemSectionDescription`, and a `ComponentItemSectionExample`. No exceptions.
7. Do not use or suggest string props for visible display text in component APIs or examples. This includes titles, descriptions, labels, captions, language labels, status text, and similar UI copy. If the string appears on screen, it should be child content or a dedicated text subcomponent, not a prop. String props are only acceptable for non-display configuration values.
8. Do not suggest named slots such as `<template #icon>`. If a proposed streamlining depends on named slots, do not present it as a streamlining option.
9. If a proposed streamlining depends on string props for visible display text, do not present it as a streamlining option.
10. Do not use abbreviated names for example data, props, variables, or fields when a clear full word is available (for example, use `question` and `answer`, not `q` and `a`).
11. Be decisive when recommending changes. Do not suggest an option and then undercut it with language like "but honestly I wouldn't."

## Review component flow

Trigger this isolated flow only when the user says `review component <component-name>` (for example, `review component banner`). Do not run this whole flow for casual questions, implementation requests, or ordinary code reviews unless the user uses that phrase. These are absolute rules, they are not guidelines or optional, they are REQUIRED and NON-OPTIONAL.

1. Once the trigger is confirmed, first open `src/components/app/App.vue` and uncomment the line for the component being reviewed.
2. Read the component implementation files, the matching `src/pages/components/<ComponentName>.vue` page, exports, and any usage sites.
3. Automatically clean only the matching component page for the page conventions above: add the required header and section comments, ensure every `ComponentItemSection` has a title, description, and example, remove any section wrapper div, remove `data-demo`, remove abbreviated names, and keep `ComponentItemSection` blocks directly under `ComponentLayout`.
4. After automatic page cleanup, run the documented build and report whether it passed.
5. No abbreviations in components or pages. The only abbreviations allowed are universally understood abbreviations like x/y for vertical/horizontal or tmp/temp and stuff like that, everything else should be written in full words.
5. Do not edit component implementation files, exports, shared utilities, routes, or other usage sites unless the user explicitly asks for fixes.
6. Review whether the component implementation and page are incomplete, too verbose, redundant, buggy, or worth streamlining.
7. Audit the existing component and page against every rule in this guide. Do not only avoid introducing new violations; actively flag violations that are already present.
8. Output only a bullet list of problems: errors, bugs, missing expected behavior, streamlinable pieces, or convention issues that could not be fixed automatically. Do not mention things that are already correct or good.
9. Check API streamlining without suggesting named slots such as `<template #icon>` and without suggesting string props for visible display text. Flag existing string props such as `language="javascript"` when that value is rendered as UI copy. If a possible streamline depends on either banned pattern, do not present it as streamlinable.
10. Be decisive. Recommend only changes that should actually be made; do not suggest an option and then walk it back.
11. If implementation fixes are requested after the review, apply the agreed changes, run the documented build, and report the result.
12. After finishing a scan/sweep/fix, read this section AGAIN from new (not from memory) and go through all your changes and verify whether you followed through all these rules.