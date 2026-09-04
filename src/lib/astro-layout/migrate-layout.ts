import type { RecentChangeEntry } from '@/lib/recent-changes/types';
import type {
	CategoryDefinition,
	CategoryDisplays,
	DisplaySlot,
	LayoutZonesMap,
	NavItem,
	SiteAstroLayout,
} from './types';
import { findSlotByComponent } from './slots';
import {
	flattenSlots,
	migrateFlatSlotsToZones,
	resolveLayoutZones,
} from './zones';
import { sortSlotsByOrder } from './slots';

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
			{ label: 'Deklaracja dostępności', href: '/gmina/deklaracja-dostepnosci' },
			{ label: 'Klauzula informacyjna', href: '/gmina/klauzula-rodo' },
		],
		copyrightSuffix: 'Wszelkie prawa zastrzeżone.',
		contactCtaLabel: 'Przejdź do kontaktu i mapy dojazdu',
		contactCtaHref: '/kontakt',
	};
}

function upsertZoneComponent(components: DisplaySlot[], slot: DisplaySlot): DisplaySlot[] {
	const idx = components.findIndex((s) => s.component === slot.component);
	if (idx === -1) return [...components, slot];
	const next = [...components];
	const current = next[idx]!;
	// Istniejące (zapisane) wartości mają pierwszeństwo — wartości domyślne tylko
	// uzupełniają brakujące klucze. Inaczej domyślny widget nadpisywałby edycje
	// użytkownika przy każdej normalizacji (np. dane stopki resetowane do wartości z kodu).
	next[idx] = { ...slot, ...current, widget: { ...slot.widget, ...current.widget } };
	return next;
}

export function ensureZoneChromeComponents(
	zones: LayoutZonesMap,
	navigation: NavItem[] = [],
): LayoutZonesMap {
	let headerComponents = zones.header.components;
	headerComponents = upsertZoneComponent(headerComponents, {
		id: DEFAULT_CHROME_IDS.headerBrand,
		label: 'Logo',
		component: 'header.brand',
		widget: defaultHeaderBrandWidget(),
	});
	headerComponents = upsertZoneComponent(headerComponents, {
		id: DEFAULT_CHROME_IDS.headerNav,
		label: 'Menu główne',
		component: 'header.navigation',
		widget: { order: 1, navigation },
	});

	return {
		...zones,
		site: {
			components: upsertZoneComponent(zones.site.components, {
				id: DEFAULT_CHROME_IDS.siteMeta,
				label: 'Meta strony',
				component: 'site.meta',
				widget: defaultSiteMetaWidget(),
			}),
		},
		topbar: {
			components: upsertZoneComponent(zones.topbar.components, {
				id: DEFAULT_CHROME_IDS.topbar,
				label: 'Pasek górny',
				component: 'topbar.tagline',
				widget: defaultTopbarWidget(),
			}),
		},
		header: { components: sortSlotsByOrder(headerComponents) },
		footer: {
			components: upsertZoneComponent(zones.footer.components, {
				id: DEFAULT_CHROME_IDS.footer,
				label: 'Stopka',
				component: 'footer.main',
				widget: defaultFooterWidget(),
			}),
		},
	};
}

/** @deprecated użyj ensureZoneChromeComponents */
export function ensureChromeSlots(slots: DisplaySlot[], navigation: NavItem[] = []): DisplaySlot[] {
	const zones = ensureZoneChromeComponents(migrateFlatSlotsToZones(slots), navigation);
	return flattenSlots(zones);
}

export function attachRecentChangeEntriesInZones(
	zones: LayoutZonesMap,
	entries: RecentChangeEntry[],
): LayoutZonesMap {
	return {
		...zones,
		sidebar: {
			components: zones.sidebar.components.map((slot) =>
				slot.component !== 'sidebar.recent_changes'
					? slot
					: { ...slot, entries: entries.length > 0 ? entries : slot.entries },
			),
		},
	};
}

/** @deprecated */
export function attachRecentChangeEntries(
	slots: DisplaySlot[],
	entries: RecentChangeEntry[],
): DisplaySlot[] {
	const zones = attachRecentChangeEntriesInZones(migrateFlatSlotsToZones(slots), entries);
	return flattenSlots(zones);
}

export function mergeLegacyLayoutParts(options: {
	categories: CategoryDefinition[];
	displays: CategoryDisplays;
	slots: DisplaySlot[];
	navigation: NavItem[];
	recentEntries?: RecentChangeEntry[];
}): DisplaySlot[] {
	let zones = ensureZoneChromeComponents(migrateFlatSlotsToZones(options.slots), options.navigation);
	if (options.recentEntries?.length) {
		zones = attachRecentChangeEntriesInZones(zones, options.recentEntries);
	}
	return flattenSlots(zones);
}

export function getNavigationFromLayout(layout: SiteAstroLayout): NavItem[] {
	const navSlot = findSlotByComponent(layout, 'header.navigation');
	const fromSlot = navSlot?.widget?.navigation;
	if (Array.isArray(fromSlot) && fromSlot.length > 0) return fromSlot;
	return layout.navigation;
}

export function syncNavigationInLayout(layout: SiteAstroLayout, navigation: NavItem[]): SiteAstroLayout {
	const updated = applyLayoutZones(layout, (zones) => {
		const headerComponents = zones.header.components.map((slot) =>
			slot.component !== 'header.navigation'
				? slot
				: {
						...slot,
						widget: { ...slot.widget, order: slot.widget?.order ?? 1, navigation },
					},
		);
		return ensureZoneChromeComponents({ ...zones, header: { components: headerComponents } }, navigation);
	});
	return { ...updated, navigation };
}

export function getRecentChangeEntriesFromLayout(layout: SiteAstroLayout): RecentChangeEntry[] {
	const slot = findSlotByComponent(layout, 'sidebar.recent_changes');
	return slot?.entries ?? [];
}

export function upsertRecentChangeEntriesInLayout(
	layout: SiteAstroLayout,
	entries: RecentChangeEntry[],
): SiteAstroLayout {
	return applyLayoutZones(layout, (zones) => attachRecentChangeEntriesInZones(zones, entries));
}

function applyLayoutZones(
	layout: SiteAstroLayout,
	mutate: (zones: LayoutZonesMap) => LayoutZonesMap,
): SiteAstroLayout {
	const zones = mutate(resolveLayoutZones(layout));
	const slots = flattenSlots(zones);
	return { ...layout, zones, slots };
}

export function normalizeLayoutSlots(layout: SiteAstroLayout): SiteAstroLayout {
	const navigation = getNavigationFromLayout(layout);
	let zones = resolveLayoutZones(layout);
	zones = ensureZoneChromeComponents(zones, navigation);
	zones = attachRecentChangeEntriesInZones(zones, getRecentChangeEntriesFromLayout({ ...layout, zones, slots: flattenSlots(zones) }));
	zones = ensureZoneChromeComponents(zones, navigation);
	const slots = flattenSlots(zones);
	return syncNavigationInLayout({ ...layout, zones, slots }, navigation);
}
