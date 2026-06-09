import { describe, expect, it } from 'vitest';
import { buildSitePagePublicPath, parseSitePagePublicPath } from './url';
import { buildSitePageMarkdown } from './frontmatter';
import { sitePageMarkdownPath } from './paths';

describe('site-pages url', () => {
	it('buduje ścieżkę z prefixem', () => {
		expect(buildSitePagePublicPath('gmina', 'plan-ogolny')).toBe('/gmina/plan-ogolny');
	});

	it('buduje ścieżkę bez prefixu', () => {
		expect(buildSitePagePublicPath('', 'kontakt')).toBe('/kontakt');
	});

	it('parsuje href dwusegmentowy', () => {
		expect(parseSitePagePublicPath('/gmina/plan-ogolny')).toEqual({
			pathPrefix: 'gmina',
			slug: 'plan-ogolny',
		});
	});
});

describe('site-pages frontmatter', () => {
	it('zawiera type page i slug', () => {
		const md = buildSitePageMarkdown('Tytuł', 'gmina', 'plan-ogolny', 'Treść');
		expect(md).toContain('type: page');
		expect(md).toContain('pathPrefix: "gmina"');
		expect(md).toContain('Treść');
	});
});

describe('site-pages paths', () => {
	it('generuje ścieżkę pliku w repo', () => {
		expect(sitePageMarkdownPath('src/content/pages', 'gmina', 'plan-ogolny')).toBe(
			'src/content/pages/gmina/plan-ogolny/index.md',
		);
	});
});
