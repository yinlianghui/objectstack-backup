import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const output = path.join(root, "manifest.json");
const excluded = new Set([output, path.join(root, "SHA256SUMS")]);

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile() && !excluded.has(absolute)) files.push(absolute);
  }
  return files;
}

const files = [];
for (const absolute of (await walk(root)).sort()) {
  const content = await fs.readFile(absolute);
  files.push({
    path: path.relative(root, absolute).split(path.sep).join("/"),
    bytes: content.byteLength,
    sha256: crypto.createHash("sha256").update(content).digest("hex"),
  });
}
const manifest = {
  schemaVersion: 1,
  archive: "Framework #2678 Problem One supplemental Hook QA",
  generatedAtUtc: new Date().toISOString(),
  frameworkTarget: "98874656ffc50ce1531af52346228ffcdda73fba",
  fileCount: files.length,
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  exclusions: ["manifest.json", "SHA256SUMS"],
  files,
};
await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ output, files: files.length, bytes: manifest.totalBytes }));
