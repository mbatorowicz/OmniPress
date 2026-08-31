import { describe, expect, it } from 'vitest';
import { dashboard } from '@/i18n/pl/dashboard';
import { help } from '@/i18n/pl/help';
import { posts } from '@/i18n/pl/posts';
import { buildEditorHelpGuide, EDITOR_HELP_SECTION_IDS } from './guide-model';

describe('buildEditorHelpGuide', () => {
	const sections = buildEditorHelpGuide();
	const blob = JSON.stringify(sections);

	it('składa wszystkie sekcje w stałej kolejności', () => {
		expect(sections.map((s) => s.id)).toEqual([...EDITOR_HELP_SECTION_IDS]);
		for (const section of sections) {
			expect(section.title.length).toBeGreaterThan(0);
			expect(section.blocks.length).toBeGreaterThan(0);
		}
	});

	it('powtarza etykiety z panelu, żeby instrukcja nie rozjechała się z UI', () => {
		expect(blob).toContain(dashboard.articles.newPost);
		expect(blob).toContain(dashboard.editor.actions.save);
		expect(blob).toContain(dashboard.editor.actions.submit);
		expect(blob).toContain(dashboard.editor.actions.delete);
		expect(blob).toContain(posts.status.draft);
		expect(blob).toContain(posts.status.pending);
		expect(blob).toContain(posts.status.rejected);
		expect(blob).toContain(help.create.title);
		expect(blob).toContain(help.faq.title);
	});
});
