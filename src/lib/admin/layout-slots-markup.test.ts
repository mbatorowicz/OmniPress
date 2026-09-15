import { describe, expect, it } from 'vitest';
import { buildListRowHtml } from './layout-slots-client-ui';
import { buildSlotCardHtml, buildSlotDialogShellHtml } from './layout-slots-sections-ui';
import type { LayoutSlotsClientConfig } from './layout-slots-client';

const labels = {
	componentLabels: { 'home.pinned': 'Przypięte' },
	settingsLabel: 'Ustawienia',
	enabledLabel: 'Włączony',
	zoneBadgePrefix: 'Strefa',
};

describe('layout slot markup — escape HTML', () => {
	it('nie wstawia etykiety slotu do atrybutów bez escape', () => {
		const html = buildSlotCardHtml('home.pinned', '"><img src=x onerror=alert(1)>', 'home.pinned', {
			...labels,
			zone: 'home',
			zoneLabel: 'Główna',
		});
		expect(html).not.toContain('"><img');
		expect(html).toContain('&quot;&gt;&lt;img');
	});

	it('escapuje tytuł okna ustawień', () => {
		const html = buildSlotDialogShellHtml('x', '<script>alert(1)</script>', 'Zamknij', '<p>ok</p>');
		expect(html).not.toContain('<script>alert');
		expect(html).toContain('&lt;script&gt;');
	});
});

describe('buildListRowHtml — escape HTML', () => {
	const config = {
		componentLabels: { 'home.pinned': 'Przypięte' },
		removeSlotLabel: 'Usuń',
		componentOptionsHtml: '',
	} as unknown as LayoutSlotsClientConfig;

	it('escapuje etykietę w value', () => {
		const html = buildListRowHtml(config, 'home.pinned', 10, 'home.pinned', '"><img src=x>');
		expect(html).not.toContain('"><img');
		expect(html).toContain('&quot;&gt;&lt;img');
	});
});
