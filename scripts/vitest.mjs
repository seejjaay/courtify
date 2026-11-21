// Windows terminals (VS Code included) can start in "c:\..." with a lowercase drive letter.
// Vite then loads vitest twice and every suite dies with "reading 'config'".
// Re-spawn the vitest CLI from the same directory spelled with an uppercase drive letter.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const upperDrive = (p) => p.replace(/^[a-z]:/, (drive) => drive.toUpperCase());
const cwd = upperDrive(process.cwd());
// Resolve vitest's own entry with the same spelling, or the split comes straight back.
const vitestDir = upperDrive(path.dirname(createRequire(import.meta.url).resolve('vitest/package.json')));
const { status } = spawnSync(process.execPath, [path.join(vitestDir, 'vitest.mjs'), ...process.argv.slice(2)], {
  cwd,
  stdio: 'inherit',
});
process.exit(status ?? 1);
