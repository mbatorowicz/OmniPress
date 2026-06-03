import { resolveSupabaseUrl } from '@/lib/supabase/resolve-env';
import { markdownToSafeHtml } from './markdown';
import {
	decryptDestinationCredentials,
	isWordPressCredentials,
} from './credentials';
import type { DestinationForPublish, PostForPublish, PublishResult } from './types';

function wpRestBase(config: Record<string, unknown>): string | null {
	const base = config.wp_rest_base;
	if (typeof base !== 'string' || !base.trim()) return null;
	return base.replace(/\/$/, '');
}

function basicAuthHeader(username: string, password: string): string {
	const token = btoa(`${username}:${password}`);
	return `Basic ${token}`;
}

export async function publishToWordPress(
	post: PostForPublish,
	destination: DestinationForPublish,
): Promise<PublishResult> {
	if (!destination.is_active) {
		return { ok: false, summary: 'Destynacja nieaktywna', retryable: false };
	}

	const base = wpRestBase(destination.config);
	if (!base) {
		return { ok: false, summary: 'Brak wp_rest_base w konfiguracji', retryable: false };
	}

	const creds = await decryptDestinationCredentials(destination);
	if (!creds || !isWordPressCredentials(destination.type, creds)) {
		return { ok: false, summary: 'Brak credentials WP (ENCRYPTION_KEY?)', retryable: false };
	}

	const html = markdownToSafeHtml(post.content_md);
	const body: Record<string, unknown> = {
		title: post.title,
		content: html,
		status: 'publish',
	};
	if (post.slug) body.slug = post.slug;

	const res = await fetch(`${base}/wp/v2/posts`, {
		method: 'POST',
		headers: {
			Authorization: basicAuthHeader(creds.username, creds.application_password),
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});

	const text = await res.text();
	if (!res.ok) {
		const summary = `WP HTTP ${res.status}: ${text.slice(0, 200)}`;
		return { ok: false, summary, retryable: res.status >= 500 || res.status === 429 };
	}

	let externalId: string;
	try {
		const json = JSON.parse(text) as { id?: number };
		externalId = String(json.id ?? '');
		if (!externalId) throw new Error('brak id');
	} catch {
		return { ok: false, summary: 'WP: nieprawidłowa odpowiedź JSON', retryable: false };
	}

	return { ok: true, externalId, summary: `WP post #${externalId}` };
}

/** Sprint 2: pełny commit frontmatter + obrazy. */
export async function publishToGitHubAstro(
	_post: PostForPublish,
	destination: DestinationForPublish,
): Promise<PublishResult> {
	if (!destination.is_active) {
		return { ok: false, summary: 'Destynacja nieaktywna', retryable: false };
	}
	const repo = destination.config.repo;
	if (typeof repo !== 'string' || !repo.includes('/')) {
		return { ok: false, summary: 'Brak repo (owner/name) w konfiguracji', retryable: false };
	}
	return {
		ok: false,
		summary: 'GitHub-Astro: adapter w Sprint 2',
		retryable: false,
	};
}

export function publicAssetUrl(storagePath: string): string | null {
	const url = resolveSupabaseUrl();
	if (!url) return null;
	return `${url.replace(/\/$/, '')}/storage/v1/object/public/post-assets/${storagePath}`;
}
