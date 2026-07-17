import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const failures = [];
async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(absolute);
  }
  return files;
}
const markdownFiles = await walk(root);
for (const markdownFile of markdownFiles) {
  const text = await fs.readFile(markdownFile, "utf8");
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let link = match[1].trim().replace(/^<|>$/g, "");
    if (/^(https?:|mailto:|#)/.test(link)) continue;
    link = decodeURIComponent(link.split("#")[0]);
    if (!link) continue;
    try {
      await fs.access(path.resolve(path.dirname(markdownFile), link));
    } catch {
      failures.push(`${path.relative(root, markdownFile)} -> ${link}`);
    }
  }
}
console.log(JSON.stringify({
  ok: failures.length === 0,
  markdownFilesChecked: markdownFiles.length,
  failures,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
