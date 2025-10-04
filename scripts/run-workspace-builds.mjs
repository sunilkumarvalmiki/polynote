#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const pnpmCli = process.env.npm_execpath;

if (!pnpmCli || !existsSync(pnpmCli)) {
  console.error('Unable to locate pnpm CLI (npm_execpath not set). Please run this script via pnpm.');
  process.exitCode = 1;
  process.exit();
}

const run = (args) => {
  execFileSync(process.execPath, [pnpmCli, ...args], {
    stdio: 'inherit',
    env: process.env,
  });
};

run(['--filter', '@polynote/shared', 'run', 'build']);
run(['--filter', '!@polynote/shared', 'run', 'build']);
