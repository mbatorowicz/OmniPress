import {
	decryptDestinationCredentials,
	isWordPressCredentials,
} from '@/lib/publish/credentials';
import type { DestinationForPublish } from '@/lib/publish/types';
import type { CategoryOption } from './types';

function wpRestBase(config: Record<string, unknown>): string | null {
	const base = config.wp_rest_base;
	if (typeof base !== 'string' || !base.trim()) return null;
	return base.replace(/\/$/, '');
}

function wpAuthHeader(username: string, password: string): string {
	return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

type WpCategoryRow = { id?: number; slug?: string; name?: string };

export async function fetchWordPressCategories(
	destination: DestinationForPublish,
): Promise<CategoryOption[]> {
	const base = wpRestBase(destination.config);
	if (!base) return [];

	const headers: Record<string, string> = { Accept: 'application/json' };
	const creds = await decryptDestinationCredentials(destination);
	if (creds && isWordPressCredentials(destination.type, creds)) {
		headers.Authorization = wpAuthHeader(creds.username, creds.application_password);
	}

	const url = `${base}/categories?per_page=100&_fields=id,slug,name&orderby=name&order=asc`;
	const res = await fetch(url, { headers });
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`WordPress categories HTTP ${res.status}: ${text.slice(0, 160)}`);
	}

	const rows = (await res.json()) as WpCategoryRow[];
	return rows
		.filter((r) => typeof r.slug === 'string' && typeof r.name === 'string')
		.map((r) => ({
			slug: String(r.slug),
			name: String(r.name),
			wpCategoryId: typeof r.id === 'number' ? r.id : null,
			sources: ['wordpress'] as const,
		}));
}
