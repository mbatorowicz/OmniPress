import type {
	CategoryDefinition,
	CategoryDisplays,
	DisplaySlot,
	NavItem,
	SiteAstroLayout,
	SlotWidgetConfig,
} from './types';
import {
	DEFAULT_CATEGORIES_PATH,
	DEFAULT_LAYOUT_PATH,
	DEFAULT_NAVIGATION_PATH,
	emptySiteAstroLayout,
} from './types';
import type { RecentChangeEntry } from '@/lib/recent-changes/types';
import { isLayoutComponentId } from './components';
import { validateBannerWidget } from './banners';
import { normalizeLayoutSlots } from './migrate-layout';
import { mergeCategoryDisplays, sortSlotsByOrder } from './slots';
import { exportZonesPayload, flattenSlots, migrateFlatSlotsToZones, parseZonesFromFile } from './zones';
import {
	resolveNavEditorDepthColors,
	type NavEditorDepthColors,
} from '@/lib/admin/nav-editor-colors';
import {
	readNavMenuColumns,
	sanitizeNavMenuColumnWidth,
} from '@/lib/admin/nav-dropdown-layout';
import { normalizeCategoryDefinition } from './category-archive';

function isNavItem(raw: unknown): raw is NavItem {
	if (!raw || typeof raw !== 'object') return false;
	const o = raw as NavItem;
	return typeof o.label === 'string';
}

function normalizeNavItem(raw: unknown, isRoot = true): NavItem {
	const o = raw as NavItem;
	const item: NavItem = { label: String(o.label ?? '').trim() };
	if (typeof o.href === 'string' && o.href.trim()) item.href = o.href.trim();

	if (isRoot) {
		const columns =
			readNavMenuColumns(o.menuColumns) ?? (o.isMegaMenu === true ? 2 : undefined);
		if (columns === 2) item.menuColumns = 2;
		else if (columns === 1) item.menuColumns = 1;

		if (Array.isArray(o.menuColumnWidths)) {
			const widths = o.menuColumnWidths
				.filter((w): w is string => typeof w === 'string')
				.map((w) => sanitizeNavMenuColumnWidth(w))
				.filter((w): w is string => Boolean(w))
				.slice(0, 2);
			if (widths.length > 0) item.menuColumnWidths = widths;
		}
	}

	if (Array.isArray(o.children) && o.children.length > 0) {
		item.children = o.children.map((child) => normalizeNavItem(child, false));
	}
	return item;
}

function exportNavItem(item: NavItem, isRoot: boolean): NavItem {
	const out: NavItem = { label: item.label };
	if (item.href) out.href = item.href;

	if (isRoot && item.children?.length) {
		if (item.menuColumns === 2) out.menuColumns = 2;
		else if (item.menuColumns === 1) out.menuColumns = 1;
		if (item.menuColumnWidths?.length) {
			out.menuColumnWidths = item.menuColumnWidths
				.map(sanitizeNavMenuColumnWidth)
				.filter((width): width is string => Boolean(width))
				.slice(0, out.menuColumns === 2 ? 2 : 1);
		}
	}

	if (item.children?.length) {
		out.children = item.children.map((child) => exportNavItem(child, false));
	}
	return out;
}

export function normalizeNavItems(raw: unknown): NavItem[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(isNavItem).map((item) => normalizeNavItem(item, true));
}

function parseWidget(raw: unknown): SlotWidgetConfig | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const w = raw as SlotWidgetConfig;
	const widget: SlotWidgetConfig = {};
	if (typeof w.title === 'string' && w.title.trim()) widget.title = w.title.trim();
	if (typeof w.sectionTitle === 'string' && w.sectionTitle.trim())
		widget.sectionTitle = w.sectionTitle.trim();
	if (typeof w.emptyText === 'string' && w.emptyText.trim()) widget.emptyText = w.emptyText.trim();
	if (w.hideWhenEmpty === true) widget.hideWhenEmpty = true;
	if (typeof w.moreLink === 'string' && w.moreLink.trim()) widget.moreLink = w.moreLink.trim();
	if (typeof w.limit === 'number' && w.limit > 0) widget.limit = Math.floor(w.limit);
	if (w.enabled === false) widget.enabled = false;
	if (w.variant === 'alert' || w.variant === 'default') widget.variant = w.variant;
	if (w.pinnedOnly === true) widget.pinnedOnly = true;
	if (w.pinnedOnly === false) widget.pinnedOnly = false;
	if (typeof w.order === 'number' && Number.isFinite(w.order) && w.order >= 0) {
		widget.order = Math.floor(w.order);
	}
	if (typeof w.categoryFilter === 'string' && w.categoryFilter.trim()) {
		widget.categoryFilter = w.categoryFilter.trim();
	}
	if (typeof w.terytPowiat === 'string' && w.terytPowiat.trim()) {
		widget.terytPowiat = w.terytPowiat.trim();
	}
	if (w.mapCenter && typeof w.mapCenter === 'object') {
		const lat = Number((w.mapCenter as { lat?: unknown }).lat);
		const lon = Number((w.mapCenter as { lon?: unknown }).lon);
		if (Number.isFinite(lat) && Number.isFinite(lon)) {
			widget.mapCenter = { lat, lon };
		}
	}
	if (typeof w.mapZoom === 'number' && w.mapZoom > 0) {
		widget.mapZoom = Math.floor(w.mapZoom);
	}
	if (w.showMap === false) widget.showMap = false;
	if (Array.isArray(w.mapScopePowiaty)) {
		const codes = w.mapScopePowiaty
			.filter((c): c is string => typeof c === 'string')
			.map((c) => c.trim())
			.filter(Boolean);
		if (codes.length > 0) widget.mapScopePowiaty = codes;
	}
	if (w.detailsDisplay === 'modal' || w.detailsDisplay === 'inline') {
		widget.detailsDisplay = w.detailsDisplay;
	}
	if (w.detailsLayout === 'stacked' || w.detailsLayout === 'grid') {
		widget.detailsLayout = w.detailsLayout;
	}
	if (typeof w.detailsSummary === 'string' && w.detailsSummary.trim()) {
		widget.detailsSummary = w.detailsSummary.trim();
	}
	if (typeof w.detailsCloseLabel === 'string' && w.detailsCloseLabel.trim()) {
		widget.detailsCloseLabel = w.detailsCloseLabel.trim();
	}
	if (typeof w.bannerLabel === 'string' && w.bannerLabel.trim()) {
		widget.bannerLabel = w.bannerLabel.trim();
	}
	if (w.style === 'text' || w.style === 'image') widget.style = w.style;
	if (typeof w.imageUrl === 'string' && w.imageUrl.trim()) widget.imageUrl = w.imageUrl.trim();
	if (w.imageVariant === 'blue') widget.imageVariant = 'blue';
	if (typeof w.textTitle === 'string' && w.textTitle.trim()) widget.textTitle = w.textTitle.trim();
	if (typeof w.textButton === 'string' && w.textButton.trim()) widget.textButton = w.textButton.trim();
	if (w.linkType === 'category' || w.linkType === 'page' || w.linkType === 'external') {
		widget.linkType = w.linkType;
	}
	if (typeof w.categorySlug === 'string' && w.categorySlug.trim()) {
		widget.categorySlug = w.categorySlug.trim();
	}
	if (typeof w.pagePath === 'string' && w.pagePath.trim()) widget.pagePath = w.pagePath.trim();
	if (typeof w.externalUrl === 'string' && w.externalUrl.trim()) widget.externalUrl = w.externalUrl.trim();
	if (typeof w.text === 'string' && w.text.trim()) widget.text = w.text.trim();
	if (w.accessibilityTools === false) widget.accessibilityTools = false;
	if (typeof w.name === 'string' && w.name.trim()) widget.name = w.name.trim();
	if (typeof w.description === 'string' && w.description.trim()) widget.description = w.description.trim();
	if (typeof w.url === 'string' && w.url.trim()) widget.url = w.url.trim();
	if (typeof w.logoUrl === 'string' && w.logoUrl.trim()) widget.logoUrl = w.logoUrl.trim();
	if (typeof w.logoAlt === 'string' && w.logoAlt.trim()) widget.logoAlt = w.logoAlt.trim();
	if (typeof w.homeHref === 'string' && w.homeHref.trim()) widget.homeHref = w.homeHref.trim();
	if (typeof w.copyrightSuffix === 'string' && w.copyrightSuffix.trim()) {
		widget.copyrightSuffix = w.copyrightSuffix.trim();
	}
	if (typeof w.contactCtaLabel === 'string' && w.contactCtaLabel.trim()) {
		widget.contactCtaLabel = w.contactCtaLabel.trim();
	}
	if (typeof w.contactCtaHref === 'string' && w.contactCtaHref.trim()) {
		widget.contactCtaHref = w.contactCtaHref.trim();
	}
	if (w.contact && typeof w.contact === 'object') widget.contact = w.contact as SlotWidgetConfig['contact'];
	if (Array.isArray(w.bankAccounts)) widget.bankAccounts = w.bankAccounts as SlotWidgetConfig['bankAccounts'];
	if (Array.isArray(w.officeHours)) widget.officeHours = w.officeHours as SlotWidgetConfig['officeHours'];
	if (w.invoiceData && typeof w.invoiceData === 'object') {
		widget.invoiceData = w.invoiceData as SlotWidgetConfig['invoiceData'];
	}
	if (Array.isArray(w.legalLinks)) {
		widget.legalLinks = w.legalLinks
			.filter((link): link is { label: string; href: string } => {
				if (!link || typeof link !== 'object') return false;
				const l = link as { label?: unknown; href?: unknown };
				return typeof l.label === 'string' && typeof l.href === 'string';
			})
			.map((link) => ({ label: link.label.trim(), href: link.href.trim() }));
	}
	if (Array.isArray(w.navigation)) {
		widget.navigation = normalizeNavItems(w.navigation);
	}
	return Object.keys(widget).length > 0 ? widget : undefined;
}

function isRecentChangeEntry(raw: unknown): raw is RecentChangeEntry {
	if (!raw || typeof raw !== 'object') return false;
	const o = raw as RecentChangeEntry;
	return (
		typeof o.title === 'string' &&
		typeof o.href === 'string' &&
		typeof o.kind === 'string' &&
		typeof o.changedAt === 'string'
	);
}

function parseRecentChangeEntries(raw: unknown): RecentChangeEntry[] | undefined {
	if (!Array.isArray(raw)) return undefined;
	const entries = raw.filter(isRecentChangeEntry).map((e) => ({
		title: e.title.trim(),
		href: e.href.trim(),
		kind: e.kind,
		changedAt: e.changedAt,
		sourceId: e.sourceId?.trim() || undefined,
	}));
	return entries.length > 0 ? entries : undefined;
}

function parseSlot(raw: unknown): DisplaySlot | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as DisplaySlot;
	if (typeof o.id !== 'string' || !o.id.trim()) return null;
	if (typeof o.label !== 'string' || !o.label.trim()) return null;
	if (typeof o.component !== 'string' || !o.component.trim()) return null;
	if (!isLayoutComponentId(o.component.trim())) return null;

	const slot: DisplaySlot = {
		id: o.id.trim(),
		label: o.label.trim(),
		component: o.component.trim(),
		widget: parseWidget(o.widget),
		entries: parseRecentChangeEntries((o as DisplaySlot).entries),
	};

	if (slot.component === 'sidebar.banner' && !validateBannerWidget(slot.widget ?? {}, slot.label)) {
		return null;
	}

	return slot;
}

export function parseSlots(raw: unknown): DisplaySlot[] {
	if (!Array.isArray(raw)) return [];
	return sortSlotsByOrder(raw.map(parseSlot).filter((s): s is DisplaySlot => s !== null));
}

export function parseNavigationJson(text: string): NavItem[] {
	const parsed = JSON.parse(text) as unknown;
	if (!Array.isArray(parsed)) throw new Error('Menu musi być tablicą JSON');
	if (!parsed.every(isNavItem)) throw new Error('Nieprawidłowy element menu');
	return normalizeNavItems(parsed);
}

export function parseCategoriesFile(text: string): {
	categories: CategoryDefinition[];
	displays: CategoryDisplays;
	slots: DisplaySlot[];
} {
	return parseLayoutFile(text);
}

export function parseLayoutFile(text: string): {
	categories: CategoryDefinition[];
	displays: CategoryDisplays;
	slots: DisplaySlot[];
	zones: import('./types').LayoutZonesMap;
} {
	const parsed = JSON.parse(text) as unknown;

	if (Array.isArray(parsed)) {
		const empty = migrateFlatSlotsToZones([]);
		return {
			categories: parsed
				.map(normalizeCategoryDefinition)
				.filter((c): c is CategoryDefinition => c !== null),
			slots: [],
			zones: empty,
			displays: {},
		};
	}

	if (!parsed || typeof parsed !== 'object') {
		throw new Error('Nieprawidłowy plik layoutu');
	}

	const obj = parsed as {
		categories?: CategoryDefinition[];
		displays?: CategoryDisplays;
		slots?: unknown;
		zones?: unknown;
	};

	const categories = (obj.categories ?? [])
		.map(normalizeCategoryDefinition)
		.filter((c): c is CategoryDefinition => c !== null);

	const legacySlots = parseSlots(obj.slots);
	const zones = parseZonesFromFile(obj, legacySlots);
	const slots = flattenSlots(zones);
	const displays = mergeCategoryDisplays(slots, obj.displays ?? {});

	return { categories, displays, slots, zones };
}

export function buildLayoutFilePayload(layout: SiteAstroLayout): string {
	const normalized = normalizeLayoutSlots(layout);
	return `${JSON.stringify(
		{
			categories: normalized.categories,
			displays: normalized.categoryDisplays,
			zones: exportZonesPayload(normalized.zones),
		},
		null,
		'\t',
	)}\n`;
}

export function buildCategoriesFilePayload(layout: SiteAstroLayout): string {
	return buildLayoutFilePayload(layout);
}

export function buildNavigationFilePayload(navigation: NavItem[]): string {
	const payload = navigation.map((item) => exportNavItem(item, true));
	return `${JSON.stringify(payload, null, '\t')}\n`;
}

export function normalizeSiteAstroLayout(raw: unknown): SiteAstroLayout {
	if (!raw || typeof raw !== 'object') return emptySiteAstroLayout();
	const o = raw as Partial<SiteAstroLayout> & { zones?: unknown; slots?: unknown };
	const legacySlots = parseSlots(o.slots);
	const zones = parseZonesFromFile(o, legacySlots);
	const slots = flattenSlots(zones);
	const syncRaw = o.sync;
	const sync =
		syncRaw && typeof syncRaw === 'object'
			? {
					lastDraftSavedAt:
						typeof syncRaw.lastDraftSavedAt === 'string'
							? syncRaw.lastDraftSavedAt
							: undefined,
					lastPublishedAt:
						typeof syncRaw.lastPublishedAt === 'string' ? syncRaw.lastPublishedAt : undefined,
					lastPublishedSha:
						typeof syncRaw.lastPublishedSha === 'string'
							? syncRaw.lastPublishedSha
							: undefined,
					publishedNavHash:
						typeof syncRaw.publishedNavHash === 'string'
							? syncRaw.publishedNavHash
							: undefined,
					publishedCategoriesHash:
						typeof syncRaw.publishedCategoriesHash === 'string'
							? syncRaw.publishedCategoriesHash
							: undefined,
					publishedLayoutHash:
						typeof syncRaw.publishedLayoutHash === 'string'
							? syncRaw.publishedLayoutHash
							: undefined,
					publishedLiveBlobSha:
						typeof syncRaw.publishedLiveBlobSha === 'string'
							? syncRaw.publishedLiveBlobSha
							: undefined,
					layoutContract:
						syncRaw.layoutContract === 'zones_v2' ||
						syncRaw.layoutContract === 'legacy' ||
						syncRaw.layoutContract === 'unified'
							? syncRaw.layoutContract
							: zones && !o.slots
								? 'zones_v2'
								: undefined,
				}
			: undefined;

	const layoutPath = o.layoutPath?.trim() || o.categoriesPath?.trim() || DEFAULT_LAYOUT_PATH;

	let layout: SiteAstroLayout = {
		navigation: normalizeNavItems(o.navigation),
		categoryDisplays: mergeCategoryDisplays(slots, o.categoryDisplays ?? {}),
		categories: Array.isArray(o.categories)
			? o.categories
					.map(normalizeCategoryDefinition)
					.filter((c): c is CategoryDefinition => c !== null)
			: [],
		zones,
		slots,
		layoutPath,
		navigationPath: o.navigationPath?.trim() || DEFAULT_NAVIGATION_PATH,
		categoriesPath: o.categoriesPath?.trim() || DEFAULT_CATEGORIES_PATH,
		navEditorDepthColors: parseNavEditorDepthColorsRaw(o.navEditorDepthColors),
		sync,
	};

	layout = normalizeLayoutSlots(layout);
	layout.categoryDisplays = mergeCategoryDisplays(layout.slots, layout.categoryDisplays);
	layout.sync = { ...layout.sync, layoutContract: 'zones_v2' };
	return layout;
}

function parseNavEditorDepthColorsRaw(raw: unknown): NavEditorDepthColors | undefined {
	if (!Array.isArray(raw) || raw.length < 3) return undefined;
	const parsed = raw.slice(0, 3).map((item) => {
		if (!item || typeof item !== 'object') return null;
		return item as Record<string, unknown>;
	});
	if (parsed.some((item) => item === null)) return undefined;
	return resolveNavEditorDepthColors(parsed as NavEditorDepthColors);
}
