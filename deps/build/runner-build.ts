import { mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import vuePlugin from "@deps/build/vue-sfc-plugin.ts";

const root = new URL("../../", import.meta.url).pathname;
const outdir = root + "dist";
const tailwind = import.meta.dir + "/cli-tailwindcss";
const stylesheetLink = '<link rel="stylesheet" href="/dist/app.css">';

const externalStylesheetPlugin: Bun.BunPlugin = {
  name: "external-stylesheet",
  setup(build) {
    build.onLoad({ filter: /index\.html$/ }, async ({ path }) => ({
      contents: (await Bun.file(path).text()).replace(stylesheetLink, ""),
      loader: "html",
    }));
  },
};

// Builds one HTML entrypoint into a self-contained file: bundles + inlines its JS (and any CSS),
// then links the shared, externally-compiled Tailwind stylesheet. Used for the docs app and for
// each template app (which the docs Templates section embeds via <iframe>).
async function buildSelfContainedHtml(entrypoint: string, entryOutdir: string, cssHref: string) {
  const result = await Bun.build({
    entrypoints: [entrypoint],
    outdir: entryOutdir,
    plugins: [externalStylesheetPlugin, vuePlugin],
    minify: true,
    splitting: false,
    target: "browser",
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    throw new Error(`Build failed for ${entrypoint}`);
  }

  const htmlOutput = result.outputs.find((output) => output.path.endsWith(".html"));

  if (!htmlOutput) {
    throw new Error(`Build did not produce an HTML entrypoint for ${entrypoint}`);
  }

  let html = await htmlOutput.text();

  for (const output of result.outputs) {
    if (output.path === htmlOutput.path) continue;

    const assetName = basename(output.path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (output.path.endsWith(".js")) {
      const scriptTag = new RegExp(
        `<script\\b[^>]*\\bsrc=["'](?:\\./)?${assetName}["'][^>]*><\\/script>`,
      );
      const javascript = await output.text();
      html = html.replace(scriptTag, () => `<script type="module">${javascript}</script>`);
    }

    if (output.path.endsWith(".css")) {
      const styleTag = new RegExp(
        `<link\\b(?=[^>]*\\brel=["']stylesheet["'])[^>]*\\bhref=["'](?:\\./)?${assetName}["'][^>]*>`,
      );
      const css = await output.text();
      html = html.replace(styleTag, () => `<style>${css}</style>`);
    }
  }

  html = html.replace("</head>", `  <link rel="stylesheet" href="${cssHref}">\n</head>`);

  await Bun.write(htmlOutput.path, html);

  for (const output of result.outputs) {
    if (output.path !== htmlOutput.path) {
      await rm(output.path, { force: true });
    }
  }

  return htmlOutput.path;
}

await rm(outdir, { recursive: true, force: true });

const htmlOutputPath = await buildSelfContainedHtml(root + "src/index.html", outdir, "/app.css");

// Compile one Tailwind entry. Used for the docs app.css and for each template's own app.css.
async function compileCss(input: string, output: string) {
  const proc = Bun.spawn([tailwind, "-i", input, "-o", output, "--minify"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Tailwind build failed for ${input} (exit code ${code})`);
  }
}

await compileCss(root + "src/app.css", outdir + "/app.css");

const assetsSource = root + "src/assets";

// Copies through memory rather than fs.cp: on macOS, fs.cp clones files
// (APFS clonefile), which emits watcher events on the SOURCE tree and sends
// the dev server's src watcher into an infinite rebuild loop.
async function copyDirectory(source: string, destination: string) {
  await mkdir(destination, { recursive: true });

  for (const entry of await readdir(source, { withFileTypes: true })) {
    const sourcePath = `${source}/${entry.name}`;
    const destinationPath = `${destination}/${entry.name}`;

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
    } else {
      await Bun.write(destinationPath, await Bun.file(sourcePath).arrayBuffer());
    }
  }
}

if (existsSync(assetsSource)) {
  await copyDirectory(assetsSource, outdir + "/assets");
}

// Templates are built LAST. Each src/pages/templates/<slug>/ is its own standalone app (own hash
// router + pages) compiled to dist/templates/<slug>/index.html. They all link the ONE shared
// /app.css (single global theme); the Theme Tweaker applies its overrides into them at runtime.
const templatesSource = root + "src/pages/templates";

if (existsSync(templatesSource)) {
  for (const entry of await readdir(templatesSource, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const templateEntrypoint = `${templatesSource}/${entry.name}/index.html`;
    if (!existsSync(templateEntrypoint)) {
      console.warn(`Skipping template "${entry.name}": no index.html entrypoint`);
      continue;
    }
    await buildSelfContainedHtml(templateEntrypoint, `${outdir}/templates/${entry.name}`, "/app.css");
  }
}

console.log(`Built ${htmlOutputPath}`);
