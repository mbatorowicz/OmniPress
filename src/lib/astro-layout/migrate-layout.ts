import type { RecentChangeEntry } from '@/lib/recent-changes/types';
import type { CategoryDefinition, CategoryDisplays, DisplaySlot, NavItem, SiteAstroLayout } from './types';
import { findSlotByComponent, sortSlotsByOrder } from './slots';

export const DEFAULT_CHROME_IDS = {
	siteMeta: 'site_meta',
	topbar: 'topbar_main',
	headerBrand: 'header_brand',
	headerNav: 'header_navigation',
	footer: 'footer_main',
} as const;

export function defaultSiteMetaWidget() {
	return {
		order: 0,
		name: 'Gmina Miedzna',
		description: 'Oficjalny portal informacyjny Urzędu Gminy w Miedznie',
		url: 'https://gmina-miedzna.pl',
	};
}

export function defaultTopbarWidget() {
	return {
		order: 0,
		text: 'Gmina Miedzna - Oficjalny portal informacyjny',
	};
}

export function defaultHeaderBrandWidget() {
	return {
		order: 0,
		logoUrl: '/logo.svg',
		logoAlt: 'Herb Gminy Miedzna',
		homeHref: '/',
	};
}

export function defaultFooterWidget() {
	return {
		order: 0,
		contact: {
			addressLine1: 'ul. 11 Listopada 4',
			addressLine2: '07-106 Miedzna',
			phones: ['(0-25) 691-83-27', '(0-25) 691-83-28'],
			email: 'sekretariat@gmina-miedzna.pl',
			nip: '824-126-13-73',
			regon: '000544556',
			epuap: '366ap2kaiu',
			eDoreczenia: 'AE:PL-20566-32159-EIVFC-16',
		},
		bankAccounts: [
			{ name: 'Rachunek główny', number: '41 9221 0000 0039 1111 2000 0020' },
			{ name: 'Opłaty za odbiór odpadów', number: '63 9221 0000 0039 1111 2000 0100' },
		],
		officeHours: [{ day: 'Pracujemy od 7.30 do 15.30', hours: '' }],
		invoiceData: {
			buyer: {
				title: 'Nabywca',
				name: 'Gmina Miedzna',
				address: 'ul. 11 Listopada 4\n07-106 Miedzna',
				nip: '824-172-35-14',
			},
			recipient: {
				title: 'Odbiorca',
				name: 'Urząd Gminy w Miedznie',
				address: 'ul. 11 Listopada 4\n07-106 Miedzna',
				nip: '824-126-13-73',
			},
		},
		legalLinks: [
			{ label: 'Deklaracja dostępności', href: '/deklaracja-dostepnosci' },
			{ label: 'Polityka prywatności', href: '/polityka-prywatnosci' },
		],
		copyrightSuffix: 'Wszelkie prawa zastrzeżone.',
		contactCtaLabel: 'Przejdź do kontaktu i mapy dojazdu',
		contactCtaHref: '/kontakt',
	};
}

function upsertSlot(slots: DisplaySlot[], slot: DisplaySlot): DisplaySlot[] {
	const idx = slots.findIndex((s) => s.component === slot.component);
	if (idx === -1) return [...slots, slot];
	const next = [...slots];
	next[idx] = { ...next[idx], ...slot, widget: { ...next[idx].widget, ...slot.widget } };
	return next;
}

export function ensureChromeSlots(slots: DisplaySlot[], navigation: NavItem[] = []): DisplaySlot[] {
	let next = [...slots];
	next = upsertSlot(next, {
		id: DEFAULT_CHROME_IDS.siteMeta,
		label: 'Meta strony',
		component: 'site.meta',
		widget: defaultSiteMetaWidget(),
	});
	next = upsertSlot(next, {
		id: DEFAULT_CHROME_IDS.topbar,
		label: 'Pasek górny',
		component: 'topbar.tagline',
		widget: defaultTopbarWidget(),
	});
	next = upsertSlot(next, {
		id: DEFAULT_CHROME_IDS.headerBrand,
		label: 'Logo',
		component: 'header.brand',
		widget: defaultHeaderBrandWidget(),
	});
	next = upsertSlot(next, {
		id: DEFAULT_CHROME_IDS.headerNav,
		label: 'Menu główne',
		component: 'header.navigation',
		widget: { order: 1, navigation },
	});
	next = upsertSlot(next, {
		id: DEFAULT_CHROME_IDS.footer,
		label: 'Stopka',
		component: 'footer.main',
		widget: defaultFooterWidget(),
	});
	return sortSlotsByOrder(next);
}

export function attachRecentChangeEntries(
	slots: DisplaySlot[],
	entries: RecentChangeEntry[],
): DisplaySlot[] {
	return slots.map((slot) => {
		if (slot.component !== 'sidebar.recent_changes') return slot;
		return { ...slot, entries: entries.length > 0 ? entries : slot.entries };
	});
}

export function mergeLegacyLayoutParts(options: {
	categories: CategoryDefinition[];
	displays: CategoryDisplays;
	slots: DisplaySlot[];
	navigation: NavItem[];
	recentEntries?: RecentChangeEntry[];
}): DisplaySlot[] {
	let slots = ensureChromeSlots(options.slots, options.navigation);
	if (options.recentEntries?.length) {
		slots = attachRecentChangeEntries(slots, options.recentEntries);
	}
	return slots;
}

export function getNavigationFromLayout(layout: SiteAstroLayout): NavItem[] {
	const navSlot = findSlotByComponent(layout, 'header.navigation');
	const fromSlot = navSlot?.widget?.navigation;
	if (Array.isArray(fromSlot) && fromSlot.length > 0) return fromSlot;
	return layout.navigation;
}

export function syncNavigationInLayout(layout: SiteAstroLayout, navigation: NavItem[]): SiteAstroLayout {
	const slots = ensureChromeSlots(layout.slots, navigation).map((slot) => {
		if (slot.component !== 'header.navigation') return slot;
		return {
			...slot,
			widget: { ...slot.widget, order: slot.widget?.order ?? 1, navigation },
		};
	});
	return { ...layout, navigation, slots };
}

export function getRecentChangeEntriesFromLayout(layout: SiteAstroLayout): RecentChangeEntry[] {
	const slot = findSlotByComponent(layout, 'sidebar.recent_changes');
	return slot?.entries ?? [];
}

export function upsertRecentChangeEntriesInLayout(
	layout: SiteAstroLayout,
	entries: RecentChangeEntry[],
): SiteAstroLayout {
	const slots = layout.slots.map((slot) => {
		if (slot.component !== 'sidebar.recent_changes') return slot;
		return { ...slot, entries };
	});
	return { ...layout, slots };
}

export function normalizeLayoutSlots(layout: SiteAstroLayout): SiteAstroLayout {
	const navigation = getNavigationFromLayout(layout);
	let slots = ensureChromeSlots(layout.slots, navigation);
	slots = attachRecentChangeEntries(slots, getRecentChangeEntriesFromLayout({ ...layout, slots }));
	return syncNavigationInLayout({ ...layout, slots }, navigation);
}
