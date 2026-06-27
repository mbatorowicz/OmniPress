import { describe, expect, it } from 'vitest';
import {
	DEFAULT_NAV_EDITOR_DEPTH_COLORS,
	expandNavEditorDepthColor,
	parseNavEditorDepthColorsFromForm,
	pickContrastText,
	resolveNavEditorDepthColors,
} from './nav-editor-colors';

describe('nav-editor-colors', () => {
	it('parseNavEditorDepthColorsFromForm czyta accent z formularza', () => {
		const form = new FormData();
		form.set('nav_editor_depth_0_accent', '#112233');
		form.set('nav_editor_depth_1_accent', '#445566');
		form.set('nav_editor_depth_2_accent', '#778899');

		const colors = parseNavEditorDepthColorsFromForm(form);
		expect(colors[0]?.accent).toBe('#112233');
		expect(colors[1]?.accent).toBe('#445566');
		expect(colors[2]?.accent).toBe('#778899');
	});

	it('parseNavEditorDepthColorsFromForm migruje stary format border/surface', () => {
		const form = new FormData();
		form.set('nav_editor_depth_0_border', '#112233');
		form.set('nav_editor_depth_0_surface', '#aabbcc');
		form.set('nav_editor_depth_1_border', '#445566');
		form.set('nav_editor_depth_2_surface', '#ffeedd');

		const colors = parseNavEditorDepthColorsFromForm(form);
		expect(colors[0]?.accent).toBe('#aabbcc');
		expect(colors[1]?.accent).toBe('#445566');
		expect(colors[2]?.accent).toBe('#ffeedd');
	});

	it('resolveNavEditorDepthColors uzupełnia brakujące wartości domyślnymi', () => {
		const colors = resolveNavEditorDepthColors([
			{ accent: '#111111' },
			DEFAULT_NAV_EDITOR_DEPTH_COLORS[1],
			DEFAULT_NAV_EDITOR_DEPTH_COLORS[2],
		]);
		expect(colors[0]?.accent).toBe('#111111');
		expect(colors[1]?.accent).toBe(DEFAULT_NAV_EDITOR_DEPTH_COLORS[1].accent);
	});

	it('resolveNavEditorDepthColors migruje stary format { border, surface, text }', () => {
		const colors = resolveNavEditorDepthColors([
			{ border: '#112233', surface: '#aabbcc', text: '#010203' },
			{ border: '#445566', surface: '#ddeeff', text: '#040506' },
			{ border: '#778899', surface: '#ffeedd', text: '#070809' },
		] as never);
		expect(colors[0]?.accent).toBe('#aabbcc');
		expect(colors[1]?.accent).toBe('#ddeeff');
		expect(colors[2]?.accent).toBe('#ffeedd');
	});

	it('pickContrastText zwraca biały tekst na ciemnym tle', () => {
		expect(pickContrastText('#1e4d7b')).toBe('#ffffff');
	});

	it('pickContrastText zwraca ciemny tekst na jasnym tle', () => {
		expect(pickContrastText('#7dd3fc')).toBe('#0f172a');
		expect(pickContrastText('#c4b5fd')).toBe('#0f172a');
	});

	it('expandNavEditorDepthColor ustawia border i surface na accent', () => {
		const expanded = expandNavEditorDepthColor('#1e4d7b');
		expect(expanded.border).toBe('#1e4d7b');
		expect(expanded.surface).toBe('#1e4d7b');
		expect(expanded.text).toBe('#ffffff');
		expect(expanded.muted).toMatch(/^#[0-9a-f]{6}$/);
	});
});
