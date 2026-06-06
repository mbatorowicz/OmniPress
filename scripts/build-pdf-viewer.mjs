import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'omnipress');

mkdirSync(outDir, { recursive: true });

await esbuild.build({
	entryPoints: [join(root, 'src', 'lib', 'pdf-viewer', 'standalone-entry.ts')],
	bundle: true,
	format: 'esm',
	platform: 'browser',
	target: 'es2022',
	outfile: join(outDir, 'pdf-viewer.js'),
	sourcemap: false,
	minify: true,
});

copyFileSync(
	join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs'),
	join(outDir, 'pdf.worker.mjs'),
);

console.log('Built public/omnipress/pdf-viewer.js');
