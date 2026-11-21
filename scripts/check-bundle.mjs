// Initial-JS budget for the landing, run after `next build`: every script the prerendered `/`
// loads, gzipped, must stay under the limit, and none may contain GSAP (it loads after LCP).
// Reads the prerendered HTML because Turbopack builds don't write an app-build manifest.
//
// The spec's ~150 KB can't hold: React 19 + the Next 16 app-router chunks alone are ~146 KB
// gzipped (measured 2026-11-22). The limit guards everything on top of that shared floor; the
// LCP, CLS and long-task gates in e2e/marketing-perf.spec.ts are the binding performance checks.
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMIT_BYTES = 240 * 1024;
const PAGE = '.next/server/app/index.html';

if (!existsSync(PAGE)) {
  console.error(`check-bundle: ${PAGE} not found. Run \`npm run build\` first.`);
  process.exit(1);
}

const html = readFileSync(PAGE, 'utf8');
const scripts = [...new Set([...html.matchAll(/<script[^>]*\ssrc="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]))];

let total = 0;
const withGsap = [];
for (const src of scripts) {
  const code = readFileSync(`.next${src.replace(/^\/_next/, '')}`);
  total += gzipSync(code).length;
  if (/GreenSock|ScrollTrigger|gsap\./.test(code.toString('utf8'))) withGsap.push(src);
}

console.log(`/: ${scripts.length} initial scripts, ${(total / 1024).toFixed(1)} KB gzipped (limit ${LIMIT_BYTES / 1024} KB)`);
console.log(withGsap.length ? `gsap: FOUND in initial chunks ${withGsap.join(', ')}` : 'gsap: not in initial chunks');
if (total > LIMIT_BYTES || withGsap.length > 0) process.exit(1);
