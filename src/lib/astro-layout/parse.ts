import type {
	CategoryDefinition,
	CategoryDisplays,
	DisplaySlot,
	NavItem,
	SiteAstroLayout,
	SlotWidgetConfig,
} from './types';
import { DEFAULT_CATEGORIES_PATH, DEFAULT_NAVIGATION_PATH, emptySiteAstroLayout } from './types';
import { isLayoutComponentId } from './components';
import { validateBannerWidget } from './banners';
import { mergeCategoryDisplays, sortSlotsByOrder } from './slots';

function isNavItem(raw: unknown): raw is NavItem {
	if (!raw || typeof raw !== 'object') return false;
	const o = raw as NavItem;
	return typeof o.label === 'string';
}

function normalizeNavItem(raw: unknown): NavItem {
	const o = raw as NavItem;
	const item: NavItem = { label: String(o.label ?? '').trim() };
	if (typeof o.href === 'string' && o.href.trim()) item.href = o.href.trim();
	if (o.isMegaMenu === true) item.isMegaMenu = true;
	if (Array.isArray(o.children) && o.children.length > 0) {
		item.children = o.children.map(normalizeNavItem);
	}
	return item;
}

export function normalizeNavItems(raw: unknown): NavItem[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(isNavItem).map(normalizeNavItem);
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
	return Object.keys(widget).length > 0 ? widget : undefined;
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
	const parsed = JSON.parse(text) as unknown;

	if (Array.isArray(parsed)) {
		return {
			categories: parsed
				.filter((r) => r && typeof r === 'object' && 'slug' in r && 'name' in r)
				.map((r) => ({
					slug: String((r as CategoryDefinition).slug),
					name: String((r as CategoryDefinition).name),
				})),
			slots: [],
			displays: {},
		};
	}

	if (!parsed || typeof parsed !== 'object') {
		throw new Error('Nieprawidłowy plik kategorii');
	}

	const obj = parsed as {
		categories?: CategoryDefinition[];
		displays?: CategoryDisplays;
		slots?: unknown;
	};

	const categories = (obj.categories ?? [])
		.filter((c) => c?.slug && c?.name)
		.map((c) => ({ slug: String(c.slug), name: String(c.name) }));

	const slots = parseSlots(obj.slots);
	const displays = mergeCategoryDisplays(slots, obj.displays ?? {});

	return { categories, displays, slots };
}

export function buildCategoriesFilePayload(layout: SiteAstroLayout): string {
	return `${JSON.stringify(
		{
			categories: layout.categories,
			displays: layout.categoryDisplays,
			slots: sortSlotsByOrder(layout.slots),
		},
		null,
		'\t',
	)}\n`;
}

export function buildNavigationFilePayload(navigation: NavItem[]): string {
	return `${JSON.stringify(navigation, null, '\t')}\n`;
}

export function normalizeSiteAstroLayout(raw: unknown): SiteAstroLayout {
	if (!raw || typeof raw !== 'object') return emptySiteAstroLayout();
	const o = raw as Partial<SiteAstroLayout>;
	const slots = parseSlots(o.slots);
	return {
		navigation: normalizeNavItems(o.navigation),
		categoryDisplays: mergeCategoryDisplays(slots, o.categoryDisplays ?? {}),
		categories: Array.isArray(o.categories) ? o.categories : [],
		slots,
		navigationPath: o.navigationPath?.trim() || DEFAULT_NAVIGATION_PATH,
		categoriesPath: o.categoriesPath?.trim() || DEFAULT_CATEGORIES_PATH,
	};
}
