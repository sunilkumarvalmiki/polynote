import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  entryPoints: ['electron/main.ts', 'electron/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outdir: 'dist/electron',
  external: ['electron'],
  sourcemap: false,
  minify: false,
  tsconfig: 'tsconfig.main.json',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  logLevel: 'info'
};

try {
  await esbuild.build(config);
  console.log('✓ Electron main process bundled successfully');
} catch (error) {
  console.error('✗ Build failed:', error);
  process.exit(1);
}