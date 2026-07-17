import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const repositoryFiles = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter((file) => !file.endsWith("package-lock.json"));

const checks = [
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "Supabase service-role token", pattern: /eyJ[\w-]+\.[\w-]+\.[\w-]+/ },
  { label: "assigned server secret", pattern: /(?:SUPABASE_SECRET_KEY|PORTAL_SESSION_SECRET)\s*=\s*["']?(?!replace-|playwright-|process\.env|\$\{)[A-Za-z0-9_./+=-]{24,}/ },
];

const findings = [];
for (const file of repositoryFiles) {
  if (/\.(?:png|jpe?g|gif|webp|pdf|woff2?|ico|zip)$/i.test(file)) continue;
  let contents;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const check of checks) {
    if (check.pattern.test(contents)) findings.push(`${file}: ${check.label}`);
  }
}

if (findings.length) {
  console.error("Potential secrets found (values intentionally hidden):");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(`Secret scan passed across ${repositoryFiles.length} repository files.`);
