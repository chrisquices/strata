import { watch, type FSWatcher } from "node:fs";
import { normalize } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const bun = import.meta.dir + "/cli-bun";
const buildScript = import.meta.dir + "/runner-build.ts";
const output = root + "docs/index.html";
const port = Number(Bun.env.PORT ?? 3000);
const reloadClients = new Set<ReadableStreamDefaultController<string>>();
const watchers: FSWatcher[] = [];

let building = false;
let rebuildQueued = false;
let debounce: ReturnType<typeof setTimeout> | undefined;

function notifyBrowsers() {
  for (const client of reloadClients) {
    try {
      client.enqueue("event: reload\ndata: reload\n\n");
    } catch {
      reloadClients.delete(client);
    }
  }
}

async function build() {
  if (building) {
    rebuildQueued = true;
    return;
  }

  building = true;
  console.log("\nBuilding...");

  const process = Bun.spawn([bun, buildScript], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await process.exited;
  building = false;

  if (exitCode === 0) {
    notifyBrowsers();
  } else {
    console.error(`Build failed with exit code ${exitCode}`);
  }

  if (rebuildQueued) {
    rebuildQueued = false;
    await build();
  }
}

function scheduleBuild() {
  clearTimeout(debounce);
  debounce = setTimeout(() => void build(), 75);
}

function watchPath(path: string, recursive = false) {
  const watcher = watch(path, { recursive }, scheduleBuild);
  watcher.on("error", (error) => console.error(`Watcher failed for ${path}`, error));
  watchers.push(watcher);
}

watchPath(root + "src", true);
watchPath(root + "deps/strata/ui", true);

await build();

const reloadClient = `
<script>
  const reloadEvents = new EventSource("/__live_reload");
  reloadEvents.addEventListener("reload", () => location.reload());
</script>
`;

const server = Bun.serve({
  port,
  idleTimeout: 255,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/__live_reload") {
      let controller: ReadableStreamDefaultController<string>;
      const body = new ReadableStream<string>({
        start(value) {
          controller = value;
          reloadClients.add(controller);
          controller.enqueue("retry: 250\n\n");
        },
        cancel() {
          reloadClients.delete(controller);
        },
      });

      return new Response(body, {
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "text/event-stream",
          Connection: "keep-alive",
        },
      });
    }

    // Template apps (own self-contained HTML, embedded by the docs Templates section via <iframe>).
    if (url.pathname.startsWith("/templates/") && url.pathname.endsWith(".html")) {
      // Re-validate after decoding so percent-encoded "../" can't escape docs/ (as the assets route does).
      const templatePath = normalize(decodeURIComponent(url.pathname));
      if (templatePath.startsWith("/templates/")) {
        const file = Bun.file(root + "docs" + templatePath);
        if (await file.exists()) {
          const html = await file.text();
          return new Response(html.replace("</body>", `${reloadClient}</body>`), {
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "text/html; charset=utf-8",
            },
          });
        }
      }
    }

    if (url.pathname === "/index.html" || !url.pathname.includes(".")) {
      const html = await Bun.file(output).text();
      return new Response(html.replace("</body>", `${reloadClient}</body>`), {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname.startsWith("/assets/")) {
      const assetPath = normalize(decodeURIComponent(url.pathname));
      const asset = Bun.file(root + "docs" + assetPath);

      if (assetPath.startsWith("/assets/") && (await asset.exists())) {
        return new Response(asset, {
          headers: { "Cache-Control": "no-store" },
        });
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Development server: ${server.url}`);

function shutDown() {
  for (const watcher of watchers) watcher.close();
  server.stop();
  process.exit(0);
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
