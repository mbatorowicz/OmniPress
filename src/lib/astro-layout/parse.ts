import type {
	CategoryDefinition,
	CategoryDisplays,
	DisplaySlot,
	NavItem,
	SiteAstroLayout,
	SiteWidgetsConfig,
	SlotWidgetConfig,
} from './types';
import { DEFAULT_CATEGORIES_PATH, DEFAULT_NAVIGATION_PATH, emptySiteAstroLayout } from './types';
import { mergeCategoryDisplays } from './slots';

function isNavItem(raw: unknown): raw is NavItem {
	if (!raw || typeof raw !== 'object') return false;
	const o = raw as NavItem;
	return typeof o.label === 'string';
}

function parseWidget(raw: unknown): SlotWidgetConfig | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const w = raw as SlotWidgetConfig;
	const widget: SlotWidgetConfig = {};
	if (typeof w.title === 'string' && w.title.trim()) widget.title = w.title.trim();
	if (typeof w.sectionTitle === 'string' && w.sectionTitle.trim())
		widget.sectionTitle = w.sectionTitle.trim();
	if (typeof w.emptyText === 'string' && w.emptyText.trim()) widget.emptyText = w.emptyText.trim();
	if (typeof w.moreLink === 'string' && w.moreLink.trim()) widget.moreLink = w.moreLink.trim();
	if (typeof w.limit === 'number' && w.limit > 0) widget.limit = Math.floor(w.limit);
	if (w.enabled === false) widget.enabled = false;
	if (w.variant === 'alert' || w.variant === 'default') widget.variant = w.variant;
	if (w.pinnedOnly === true) widget.pinnedOnly = true;
	if (w.pinnedOnly === false) widget.pinnedOnly = false;
	return Object.keys(widget).length > 0 ? widget : undefined;
}

function parseSlot(raw: unknown): DisplaySlot | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as DisplaySlot;
	if (typeof o.id !== 'string' || !o.id.trim()) return null;
	if (typeof o.label !== 'string' || !o.label.trim()) return null;
	if (typeof o.component !== 'string' || !o.component.trim()) return null;
	return {
		id: o.id.trim(),
		label: o.label.trim(),
		component: o.component.trim(),
		widget: parseWidget(o.widget),
	};
}

export function parseSlots(raw: unknown): DisplaySlot[] {
	if (!Array.isArray(raw)) return [];
	return raw.map(parseSlot).filter((s): s is DisplaySlot => s !== null);
}

export function parseWidgets(raw: unknown): SiteWidgetsConfig {
	if (!raw || typeof raw !== 'object') return {};
	const o = raw as SiteWidgetsConfig;
	const recent = parseWidget(o.recent_changes);
	return recent ? { recent_changes: recent } : {};
}

export function parseNavigationJson(text: string): NavItem[] {
	const parsed = JSON.parse(text) as unknown;
	if (!Array.isArray(parsed)) throw new Error('Menu musi być tablicą JSON');
	if (!parsed.every(isNavItem)) throw new Error('Nieprawidłowy element menu');
	return parsed;
}

export function parseCategoriesFile(text: string): {
	categories: CategoryDefinition[];
	displays: CategoryDisplays;
	slots: DisplaySlot[];
	widgets: SiteWidgetsConfig;
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
			widgets: {},
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
		widgets?: unknown;
	};

	const categories = (obj.categories ?? [])
		.filter((c) => c?.slug && c?.name)
		.map((c) => ({ slug: String(c.slug), name: String(c.name) }));

	const slots = parseSlots(obj.slots);
	const widgets = parseWidgets(obj.widgets);
	const displays = mergeCategoryDisplays(slots, obj.displays ?? {});

	return { categories, displays, slots, widgets };
}

export function buildCategoriesFilePayload(layout: SiteAstroLayout): string {
	return `${JSON.stringify(
		{
			categories: layout.categories,
			displays: layout.categoryDisplays,
			slots: layout.slots,
			widgets: layout.widgets,
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
	const slots = Array.isArray(o.slots) ? o.slots : [];
	return {
		navigation: Array.isArray(o.navigation) ? o.navigation : [],
		categoryDisplays: mergeCategoryDisplays(slots, o.categoryDisplays ?? {}),
		categories: Array.isArray(o.categories) ? o.categories : [],
		slots,
		widgets: o.widgets && typeof o.widgets === 'object' ? o.widgets : {},
		navigationPath: o.navigationPath?.trim() || DEFAULT_NAVIGATION_PATH,
		categoriesPath: o.categoriesPath?.trim() || DEFAULT_CATEGORIES_PATH,
	};
}
