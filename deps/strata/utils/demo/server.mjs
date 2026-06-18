// Single static demo server for web-utils.
// Serves the repository root and supports HTTP Range for optional media files.
//
//   node demo/server.mjs
//   open http://localhost:8788/demo/
//
// Demo tooling only — but still hardened against the classic static-server
// mistakes: prefix-based path containment (a sibling directory sharing the
// prefix was servable), uncaught decodeURIComponent throws (one bad %-escape
// killed the process), and misread suffix ranges.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const argumentValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] != null ? args[index + 1] : fallback;
};

const PORT = parseInt(argumentValue('--port', '8788'), 10);
const DEMO_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DEMO_DIRECTORY, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.vtt': 'text/vtt; charset=utf-8',
};

const mimeTypeFor = (file) =>
  MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';

/**
 * Parse a Range header against a known total size. Returns { start, end }
 * (inclusive) or null when the header is unsatisfiable/malformed.
 * Handles all three forms: `bytes=a-b`, `bytes=a-`, and the suffix form
 * `bytes=-n` ("the last n bytes") — the suffix form used to be misread as 0-n.
 */
function parseRangeHeader(rangeHeader, totalSize) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return null;
  const [, startText, endText] = match;
  if (startText === '' && endText === '') return null;

  if (startText === '') {
    // Suffix form: the last `endText` bytes.
    const suffixLength = parseInt(endText, 10);
    if (!Number.isFinite(suffixLength) || suffixLength === 0) return null;
    const start = Math.max(0, totalSize - suffixLength);
    return { start, end: totalSize - 1 };
  }

  const start = parseInt(startText, 10);
  const end = endText === '' ? totalSize - 1 : parseInt(endText, 10);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || end >= totalSize) return null;
  return { start, end };
}

const server = http.createServer((request, response) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent((request.url || '/').split('?')[0]);
  } catch {
    // Malformed percent-encoding (e.g. /%zz) — a URIError here used to crash
    // the whole process.
    response.writeHead(400, { 'Content-Type': 'text/plain' });
    response.end('Bad request');
    return;
  }
  if (urlPath === '/') {
    response.writeHead(302, { Location: '/demo/' });
    response.end();
    return;
  }
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));
  // Containment must compare against the root WITH a trailing separator:
  // a bare prefix check let a sibling like `web-utils-secret/` through.
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end('Not found: ' + urlPath);
      return;
    }

    const contentType = mimeTypeFor(filePath);
    const totalSize = stats.size;
    const rangeHeader = request.headers.range;

    if (rangeHeader) {
      const range = parseRangeHeader(rangeHeader, totalSize);
      if (!range) {
        response.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
        response.end();
        return;
      }
      response.writeHead(206, {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${range.start}-${range.end}/${totalSize}`,
        'Content-Length': range.end - range.start + 1,
        'Cache-Control': 'no-cache',
      });
      if (request.method === 'HEAD') return response.end();
      fs.createReadStream(filePath, { start: range.start, end: range.end }).pipe(response);
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Length': totalSize,
      'Cache-Control': 'no-cache',
    });
    if (request.method === 'HEAD') return response.end();
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(PORT, () => {
  console.log(`[demo] http://localhost:${PORT}/demo/`);
  console.log(`[demo] root=${ROOT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
