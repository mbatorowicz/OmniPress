// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import {
	getGitCommitShort,
	getPackageVersion,
	getVersionLabel,
} from './scripts/lib/git-info.mjs';
import { assetsInlineLimit } from './scripts/lib/build-inline.mjs';

const appVersion = getPackageVersion();
const appCommit = getGitCommitShort();
const appVersionLabel = getVersionLabel();

// https://astro.build/config
export default defineConfig({
	output: 'server',
	adapter: vercel(),
	vite: {
		plugins: [tailwindcss()],
		build: { assetsInlineLimit },
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', import.meta.url)),
			},
		},
		define: {
			'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(appVersion),
			'import.meta.env.PUBLIC_APP_COMMIT': JSON.stringify(appCommit),
			'import.meta.env.PUBLIC_APP_VERSION_LABEL': JSON.stringify(appVersionLabel),
		},
	},
});
