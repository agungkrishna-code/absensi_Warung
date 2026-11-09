// Next.js 16.4.x on Windows writes RSC segment prefetch payloads into nested
// `__next.<route>/<segment>/<file>.txt` directories because the export step
// joins paths with backslashes. The client requests the flattened name
// `__next.<route>.<segment>.<file>.txt`, so navigation 404s on a static host.
// This post-build step copies each payload to the name the client expects.
// On Linux/macOS the directories do not exist and the script is a no-op.

import { copyFile, readdir, rm } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("out");
let flattened = 0;

async function flattenSegmentDir(parentDir, dir, prefix) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await flattenSegmentDir(parentDir, fullPath, `${prefix}.${entry.name}`);
      continue;
    }

    const destination = path.join(parentDir, `${prefix}.${entry.name}`);
    await copyFile(fullPath, destination);
    flattened += 1;
    console.log(
      `flattened ${path.relative(outDir, fullPath)} -> ${path.relative(outDir, destination)}`,
    );
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.name.startsWith("__next.")) {
      await flattenSegmentDir(dir, fullPath, entry.name);
      await rm(fullPath, { recursive: true, force: true });
    } else {
      await walk(fullPath);
    }
  }
}

await walk(outDir);
console.log(
  flattened === 0
    ? "static export segment paths already flat"
    : `flattened ${flattened} static export segment file(s)`,
);
