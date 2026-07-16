import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const root = path.resolve(args.get("--root") ?? ".");
const output = path.resolve(args.get("--output") ?? path.join(root, "SHA256SUMS"));
const prefix = args.get("--prefix") ?? "";

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile() && absolute !== output) files.push(absolute);
  }
  return files;
}

const files = (await walk(root)).sort((left, right) => left.localeCompare(right));
const lines = [];
for (const file of files) {
  const digest = crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
  const relative = path.relative(root, file).split(path.sep).join("/");
  const manifestPath = prefix ? `${prefix.replace(/\/$/, "")}/${relative}` : relative;
  lines.push(`${digest}  ${manifestPath}`);
}
await fs.writeFile(output, lines.join("\n") + "\n");
console.log(JSON.stringify({ root, output, files: files.length }));
