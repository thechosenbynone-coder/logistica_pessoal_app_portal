import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const androidDir = resolve(process.cwd(), 'android');

if (existsSync(androidDir)) {
  console.log('android/ já existe, pulando cap add');
  process.exit(0);
}

const result = spawnSync('npx', ['cap', 'add', 'android'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
