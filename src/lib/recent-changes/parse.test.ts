import { describe, expect, it } from 'vitest';
import { buildRecentChangesPayload, parseRecentChangesFile } from './parse';
import { buildPostRecentChangeEntry } from './post-entry';
import { upsertRecentChange } from './upsert';

describe('recent-changes', () => {
	it('parsuje plik JSON', () => {
		const file = parseRecentChangesFile(
			JSON.stringify({
				entries: [
					{
						title: 'Kontakt',
						href: '/kontakt',
						kind: 'page',
						changedAt: '2026-06-03T12:00:00.000Z',
					},
				],
			}),
		);
		expect(file.entries).toHaveLength(1);
		expect(file.entries[0].href).toBe('/kontakt');
	});

	it('deduplikuje po sourceId i href', () => {
		const first = upsertRecentChange([], {
			title: 'Stary tytuł',
			href: '/aktualnosci/test',
			kind: 'news',
			changedAt: '2026-06-01T12:00:00.000Z',
			sourceId: 'post-1',
		});
		const second = upsertRecentChange(first, {
			title: 'Nowy tytuł',
			href: '/aktualnosci/test',
			kind: 'news',
			changedAt: '2026-06-03T12:00:00.000Z',
			sourceId: 'post-1',
		});
		expect(second).toHaveLength(1);
		expect(second[0].title).toBe('Nowy tytuł');
	});

	it('buduje wpis z publikacji wpisu', () => {
		const entry = buildPostRecentChangeEntry(
			{
				id: 'abc',
				site_id: 's1',
				title: 'Harmonogram odpadów',
				slug: 'harmonogram',
				content_md: '',
				status: 'published',
				category_slug: 'odpady',
				category_name: 'Gospodarka odpadami',
				wp_category_id: null,
			},
			'harmonogram',
		);
		expect(entry.href).toBe('/odpady/harmonogram');
		expect(entry.sourceId).toBe('abc');
	});

	it('generuje payload z wcięciem tab', () => {
		const payload = buildRecentChangesPayload({ entries: [] });
		expect(payload).toContain('\t');
	});
});
