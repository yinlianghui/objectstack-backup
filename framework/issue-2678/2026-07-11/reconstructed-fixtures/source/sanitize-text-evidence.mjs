import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const textExtensions = new Set([
  ".csv", ".json", ".log", ".md", ".mjs", ".ndjson", ".ts",
]);
const username = process.env.USER ?? "";
const replacements = [
  username ? [`/Users/${username}`, "/Users/<redacted>"] : null,
  [os.hostname(), "<redacted-host>"],
].filter(Boolean);

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile() && textExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

let changed = 0;
for (const file of await walk(root)) {
  const before = await fs.readFile(file, "utf8");
  const after = replacements.reduce(
    (text, [needle, replacement]) => text.split(needle).join(replacement),
    before,
  );
  if (after !== before) {
    await fs.writeFile(file, after);
    changed += 1;
  }
}
console.log(JSON.stringify({ scannedRoot: root, changedFiles: changed }));
