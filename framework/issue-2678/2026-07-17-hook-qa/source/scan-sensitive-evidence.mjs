import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const findings = [];
const binaryExtensions = new Set([".sqlite", ".png", ".jpg", ".jpeg", ".zip"]);
const patterns = [
  ["github-token", /gh[pousr]_[A-Za-z0-9]{20,}/g],
  ["bearer-token", /Bearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}/g],
  ["jwt", /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g],
  ["openai-key", /OPENAI_API_KEY\s*[=:]\s*\S+/g],
  ["session-cookie", /(?:connect\.sid|session_id)\s*[=:]\s*[^\s;]{16,}/gi],
];

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile() && !binaryExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

for (const file of await walk(root)) {
  const text = await fs.readFile(file, "utf8");
  for (const [name, pattern] of patterns) {
    for (const match of text.matchAll(pattern)) {
      findings.push({
        type: name,
        file: path.relative(root, file),
        offset: match.index,
      });
    }
  }
  for (const label of ["Serial Number (system)", "Hardware UUID", "Provisioning UDID"]) {
    for (const line of text.split("\n").filter(
      (candidate) => candidate.trimStart().startsWith(`${label}:`),
    )) {
      if (!line.includes("[REDACTED: host-unique identifier]")) {
        findings.push({ type: "unredacted-host-id", file: path.relative(root, file), label });
      }
    }
  }
}

console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
if (findings.length > 0) process.exitCode = 1;
