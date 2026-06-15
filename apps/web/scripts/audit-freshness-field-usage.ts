import fs from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components"].map((dir) => path.join(process.cwd(), dir));
const ALLOW = [
  path.normalize("app/api/v1/rankings/[type]/route.ts"),
  path.normalize("app/api/v1/recommend/route.ts"),
];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next"].includes(entry.name)) continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const findings = ROOTS
  .flatMap(walk)
  .flatMap((file) => {
    const rel = path.relative(process.cwd(), file);
    if (ALLOW.includes(path.normalize(rel))) return [];
    const text = fs.readFileSync(file, "utf8");
    return text
      .split(/\r?\n/)
      .map((line, index) => ({ rel, line, lineNumber: index + 1 }))
      .filter(({ line }) => /\bfreshness_status\b|freshnessStatus\b/.test(line))
      .filter(({ line }) => !/source_freshness_status|sourceFreshnessStatus/.test(line));
  });

console.log(JSON.stringify({
  checked_roots: ROOTS.map((root) => path.relative(process.cwd(), root)),
  disallowed_freshness_status_usages: findings,
}, null, 2));

if (findings.length > 0) {
  process.exitCode = 1;
}
