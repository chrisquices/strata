<br />
<div align="center">
    <img src="./src/assets/img/logo.png" alt="Logo" height="100">
</div>


<h1 align="center">Strata</h1>

<p align="center">
    A source-first Vue UI kit with reusable primitives for building application interfaces without package registry ceremony.<br />
    <br />
    <br />
    <a href="https://vuejs.org/">
        <img height="32" src="https://img.shields.io/badge/Vue-42B883?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue Badge" />
    </a>
    <a href="https://www.typescriptlang.org/">
        <img height="32" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript Badge" />
    </a>
    <a href="https://tailwindcss.com/">
        <img height="32" src="https://img.shields.io/badge/Tailwind-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS Badge" />
    </a>
    <a href="https://bun.sh/">
        <img height="32" src="https://img.shields.io/badge/Bun-111111?style=for-the-badge&logo=bun&logoColor=white" alt="Bun Badge" />
    </a>
</p>

---

## Overview

Strata is a personal Vue interface kit meant to be copied into projects as source, not installed from a package registry. It contains foundational UI primitives and application shell examples.

The preferred consuming-project layout is:

```txt
components/
  strata-ui/  # Strata source, updated from GitHub
  app/            # Project-owned wrappers, compositions, and custom UI
```

The `strata-ui` directory should be treated as read-only project infrastructure. If a project needs a custom button, label, variant, or composition, build that in `components/app` by wrapping or composing Strata components.

---

## Requirements

- **Git**
- **Vue** project that can consume Vue single-file components
- **Tailwind CSS** if the consuming project wants to use the Strata theme tokens and classes

For developing Strata itself, no global package install is required. The repository includes its own offline build pipeline under `deps/`.

---

## Installation

Add Strata to a project as a Git submodule:

```bash
git submodule add -b main https://github.com/<you>/strata.git components/strata-ui
```

If the repository uses `master` instead:

```bash
git submodule add -b master https://github.com/<you>/strata.git components/strata-ui
```

Project-specific components should live beside it:

```txt
components/
  strata-ui/
  app/
    AppButton.vue
    AppShell.vue
    ProjectNav.vue
```

---

## Updating

Pull the latest Strata source into the consuming project:

```bash
git submodule update --remote components/strata-ui
```

Then commit the updated submodule pointer in the consuming project:

```bash
git add components/strata-ui
git commit -m "Update Strata"
```

This is not semver or package management. It is just Git remembering which Strata snapshot the project currently uses.

---

## Customization

Do not edit files inside `components/strata-ui` from a consuming project.

Instead, customize through:

- Props
- Slots
- CSS variables and theme tokens
- Wrapper components in `components/app`
- Project-specific composed components in `components/app`

Example:

```vue
<script setup lang="ts">
import Button from "../strata-ui/src/components/ui/Button/Button.vue";
</script>

<template>
  <Button size="sm" variant="solid">
    Save changes
  </Button>
</template>
```

If a change belongs in every future project, make it in the Strata repository and update the submodule where needed.

---

## What's Included

### Primitives

Foundational Vue components under `src/components/ui`, including buttons, fields, menus, dialogs, sheets, tabs, tables, calendars, date pickers, dropdowns, popovers, tooltips, sliders, toggles, navigation, upload controls, and more.

### App Shell

Project-specific shell and documentation app components under `src/components/app`, useful as examples for composing primitives into a complete interface.

---

## Local Development

Run the development server:

```bash
./deps/build/cli-bun deps/build/runner-dev.ts
```

Open:

```txt
http://localhost:3000/
```

Agents should use:

```bash
PORT=3320 ./deps/build/cli-bun deps/build/runner-dev.ts
```

Build the static output:

```bash
./deps/build/cli-bun deps/build/runner-build.ts
```

The build writes self-contained static output to `dist/`.

---

## Philosophy

Strata is intentionally source-first:

- No npm publishing
- No package registry workflow
- No Packagist-style release process
- No required semver ceremony
- No manual edits inside consuming projects

Use GitHub as the source of truth, pull latest when you want it, and keep project-specific changes in `components/app`.
