import { parseNavigationJson } from './parse';
import { parseNavEditorDepthColorsFromForm } from '@/lib/admin/nav-editor-colors';
import { applyNavDropdownFieldsFromForm } from '@/lib/admin/nav-dropdown-layout';
import {
	getComponentKind,
	isCategoryFeedComponent,
	isLayoutComponentId,
	isSingletonComponent,
	type LayoutZone,
} from './components';
import { validateBannerWidget } from './banners';
import { readHomeTileHeight } from './home-feed';
import { slotFormFields } from './slot-form-fields';
import { mergeCategoryDisplays, sortSlotsByOrder } from './slots';
import { isExternalHref, normalizeInternalHref, countNavigationHrefs } from './validate-nav';
import { normalizeLayoutSlots, syncNavigationInLayout } from './migrate-layout';
import {
	flattenSlots,
	isLayoutZone,
	mergeZoneComponents,
	migrateFlatSlotsToZones,
	resolveLayoutZones,
	emptyZones,
} from './zones';
import { applyCategoryArchiveFieldsFromForm } from './category-archive';
import { classifyRegistryGroup } from '@/lib/admin/component-registry';
import { UNIT_COMPONENT_ZONES } from '@/lib/admin/layout-editor-tabs';
import type {
	CategoryDefinition,
	DisplaySlot,
	FooterBankAccount,
	FooterContactBlock,
	FooterInvoiceParty,
	FooterLegalLink,
	FooterOfficeHours,
	NavItem,
	SiteAstroLayout,
	SlotWidgetConfig,
} from './types';

export type LayoutFormSection = 'navigation' | 'categories' | 'components' | 'layout' | 'all';

export type LayoutFormError =
	| 'invalid_navigation'
	| 'no_categories'
	| 'no_slots'
	| 'invalid_section';

function parseIntField(raw: FormDataEntryValue | null): number | undefined {
	const n = Number(String(raw ?? '').trim());
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

function parseOrderField(raw: FormDataEntryValue | null): number | undefined {
	const n = Number(String(raw ?? '').trim());
	return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

function strField(form: FormData, name: string): string {
	return String(form.get(name) ?? '').trim();
}

function strFields(form: FormData, name: string): string[] {
	return form.getAll(name).map((v) => String(v).trim());
}

/** Wartości z pola wieloliniowego (textarea) — jedna niepusta linia = jeden wpis. */
function multilineValues(form: FormData, name: string): string[] {
	return strField(form, name)
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

/** Rozbija linię „lewa | prawa” na parę; brak separatora = całość po lewej. */
function splitPipe(line: string): [string, string] {
	const idx = line.indexOf('|');
	if (idx === -1) return [line.trim(), ''];
	return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
}

function parseBaseWidget(form: FormData, id: string, orderHint?: number): SlotWidgetConfig {
	const widget: SlotWidgetConfig = {};
	widget.order = orderHint ?? 10;
	if (form.get(`slot_enabled_${id}`) !== 'on') widget.enabled = false;
	return widget;
}

export type SlotIdentity = {
	id: string;
	label: string;
	component: string;
	order?: number;
};

/** Zbiera tożsamość slotów po ID — przy duplikatach wygrywa ostatnie wystąpienie (tabela zaawansowana). */
export function collectSlotIdentities(form: FormData): SlotIdentity[] {
	const ids = form.getAll('slot_id').map((v) => String(v).trim());
	const labels = form.getAll('slot_label').map((v) => String(v).trim());
	const components = form.getAll('slot_component').map((v) => String(v).trim());
	const orders = form.getAll('slot_widget_order');

	const byId = new Map<string, SlotIdentity>();
	for (let i = 0; i < ids.length; i++) {
		const id = ids[i];
		if (!id) continue;
		byId.set(id, {
			id,
			label: labels[i] ?? '',
			component: components[i] ?? '',
			order: parseOrderField(orders[i] ?? null),
		});
	}
	return [...byId.values()];
}

function parseFeedListFields(
	form: FormData,
	id: string,
	fields: {
		title: (id: string) => string;
		limit: (id: string) => string;
		emptyText: (id: string) => string;
		variant: (id: string) => string;
	},
	widget: SlotWidgetConfig,
): void {
	const title = strField(form, fields.title(id));
	if (title) widget.title = title;
	const limit = parseIntField(form.get(fields.limit(id)));
	if (limit) widget.limit = limit;
	const emptyText = strField(form, fields.emptyText(id));
	if (emptyText) widget.emptyText = emptyText;
	if (form.get(slotFormFields.hideWhenEmpty(id)) === 'on') widget.hideWhenEmpty = true;
	const variant = strField(form, fields.variant(id));
	if (variant === 'alert' || variant === 'default') widget.variant = variant;
}

function parseHomeFeedWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	parseFeedListFields(form, id, slotFormFields.homeFeed, widget);
	const sectionTitle = strField(form, slotFormFields.homeFeed.sectionTitle(id));
	if (sectionTitle) widget.sectionTitle = sectionTitle;
	const moreLink = strField(form, slotFormFields.homeFeed.moreLink(id));
	if (moreLink) widget.moreLink = moreLink;
	const tileHeight = readHomeTileHeight(strField(form, slotFormFields.homeFeed.tileHeight(id)));
	if (tileHeight !== undefined) widget.tileHeight = tileHeight;
}

function parseLocalFeedWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	parseFeedListFields(form, id, slotFormFields.recentChanges, widget);
}

function parseChromeWidget(form: FormData, id: string, component: string, widget: SlotWidgetConfig): void {
	if (component === 'topbar.tagline') {
		const text = strField(form, slotFormFields.topbar.text(id));
		if (text) widget.text = text;
		if (form.get(slotFormFields.topbar.accessibilityTools(id)) !== 'on') {
			widget.accessibilityTools = false;
		}
	}
	if (component === 'site.meta') {
		const name = strField(form, slotFormFields.siteMeta.name(id));
		const description = strField(form, slotFormFields.siteMeta.description(id));
		const url = strField(form, slotFormFields.siteMeta.url(id));
		if (name) widget.name = name;
		if (description) widget.description = description;
		if (url) widget.url = url;
	}
	if (component === 'header.brand') {
		const logoUrl = strField(form, slotFormFields.headerBrand.logoUrl(id));
		const logoAlt = strField(form, slotFormFields.headerBrand.logoAlt(id));
		const homeHref = strField(form, slotFormFields.headerBrand.homeHref(id));
		if (logoUrl) widget.logoUrl = logoUrl;
		if (logoAlt) widget.logoAlt = logoAlt;
		if (homeHref) widget.homeHref = homeHref;
	}
	if (component === 'footer.main') parseFooterWidget(form, id, widget);
}

function parseInvoiceParty(
	form: FormData,
	fields: { title: string; name: string; address: string; nip: string },
): FooterInvoiceParty | undefined {
	const party: FooterInvoiceParty = {};
	const title = strField(form, fields.title);
	const name = strField(form, fields.name);
	const address = strField(form, fields.address);
	const nip = strField(form, fields.nip);
	if (title) party.title = title;
	if (name) party.name = name;
	if (address) party.address = address;
	if (nip) party.nip = nip;
	return Object.keys(party).length > 0 ? party : undefined;
}

function parseFooterWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	const f = slotFormFields.footer;

	const contactCtaLabel = strField(form, f.contactCtaLabel(id));
	const contactCtaHref = strField(form, f.contactCtaHref(id));
	const copyrightSuffix = strField(form, f.copyrightSuffix(id));
	if (contactCtaLabel) widget.contactCtaLabel = contactCtaLabel;
	if (contactCtaHref) widget.contactCtaHref = contactCtaHref;
	if (copyrightSuffix) widget.copyrightSuffix = copyrightSuffix;

	// Pola pełnego formularza parsujemy tylko, gdy formularz je zawiera — chroni dane
	// przed nadpisaniem przy zapisie z widoków, które renderują sam nagłówek slotu.
	if (!form.has(f.detail(id))) return;

	const contact: FooterContactBlock = {};
	const addressLine1 = strField(form, f.addressLine1(id));
	const addressLine2 = strField(form, f.addressLine2(id));
	const email = strField(form, f.email(id));
	const nip = strField(form, f.nip(id));
	const regon = strField(form, f.regon(id));
	const epuap = strField(form, f.epuap(id));
	const eDoreczenia = strField(form, f.eDoreczenia(id));
	const phones = multilineValues(form, f.phones(id));
	if (addressLine1) contact.addressLine1 = addressLine1;
	if (addressLine2) contact.addressLine2 = addressLine2;
	if (phones.length > 0) contact.phones = phones;
	if (email) contact.email = email;
	if (nip) contact.nip = nip;
	if (regon) contact.regon = regon;
	if (epuap) contact.epuap = epuap;
	if (eDoreczenia) contact.eDoreczenia = eDoreczenia;
	widget.contact = contact;

	widget.bankAccounts = multilineValues(form, f.bankAccounts(id))
		.map((line) => {
			const [name, number] = splitPipe(line);
			const account: FooterBankAccount = {};
			if (name) account.name = name;
			if (number) account.number = number;
			return account;
		})
		.filter((account) => account.name || account.number);

	widget.officeHours = multilineValues(form, f.officeHours(id))
		.map((line) => {
			const [day, hours] = splitPipe(line);
			const item: FooterOfficeHours = {};
			if (day) item.day = day;
			if (hours) item.hours = hours;
			return item;
		})
		.filter((item) => item.day || item.hours);

	const buyer = parseInvoiceParty(form, {
		title: f.invoiceBuyerTitle(id),
		name: f.invoiceBuyerName(id),
		address: f.invoiceBuyerAddress(id),
		nip: f.invoiceBuyerNip(id),
	});
	const recipient = parseInvoiceParty(form, {
		title: f.invoiceRecipientTitle(id),
		name: f.invoiceRecipientName(id),
		address: f.invoiceRecipientAddress(id),
		nip: f.invoiceRecipientNip(id),
	});
	const invoiceData: NonNullable<SlotWidgetConfig['invoiceData']> = {};
	if (buyer) invoiceData.buyer = buyer;
	if (recipient) invoiceData.recipient = recipient;
	widget.invoiceData = invoiceData;

	widget.legalLinks = multilineValues(form, f.legalLinks(id))
		.map((line) => splitPipe(line))
		.filter(([label, href]) => label && href)
		.map(([label, href]): FooterLegalLink => ({ label, href }));
}

function parseLiveFeedWidget(
	form: FormData,
	id: string,
	component: string,
	widget: SlotWidgetConfig,
): void {
	if (component === 'sidebar.cert_advisories') parseCertWidget(form, id, widget);
	else if (component === 'sidebar.weather') parseWeatherWidget(form, id, widget);
}

function parseCertWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	parseFeedListFields(form, id, slotFormFields.cert, widget);
	const categoryFilter = strField(form, slotFormFields.cert.categoryFilter(id));
	if (categoryFilter) widget.categoryFilter = categoryFilter;
}

function parseBannerWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	widget.style = strField(form, slotFormFields.banner.style(id)) === 'text' ? 'text' : 'image';
	const imageUrl = strField(form, slotFormFields.banner.imageUrl(id));
	if (imageUrl) widget.imageUrl = imageUrl;
	if (strField(form, slotFormFields.banner.imageVariant(id)) === 'blue') widget.imageVariant = 'blue';
	const textTitle = strField(form, slotFormFields.banner.textTitle(id));
	if (textTitle) widget.textTitle = textTitle;
	const textButton = strField(form, slotFormFields.banner.textButton(id));
	if (textButton) widget.textButton = textButton;
	const linkType = strField(form, slotFormFields.banner.linkType(id));
	if (linkType === 'category' || linkType === 'page' || linkType === 'external') {
		widget.linkType = linkType;
	}
	if (widget.linkType === 'category') {
		const categorySlug = strField(form, slotFormFields.banner.categorySlug(id));
		if (categorySlug) widget.categorySlug = categorySlug;
	}
	if (widget.linkType === 'page') {
		const pagePath = strField(form, slotFormFields.banner.pagePath(id));
		if (pagePath) widget.pagePath = pagePath;
	}
	if (widget.linkType === 'external') {
		const externalUrl = strField(form, slotFormFields.banner.externalUrl(id));
		if (externalUrl) widget.externalUrl = externalUrl;
	}
}

function parseWeatherWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	const title = strField(form, slotFormFields.weather.title(id));
	if (title) widget.title = title;
	const emptyText = strField(form, slotFormFields.weather.emptyText(id));
	if (emptyText) widget.emptyText = emptyText;
	if (form.get(slotFormFields.hideWhenEmpty(id)) === 'on') widget.hideWhenEmpty = true;
	const terytPowiat = strField(form, slotFormFields.weather.terytPowiat(id));
	if (terytPowiat) widget.terytPowiat = terytPowiat;
	const lat = Number(strField(form, slotFormFields.weather.lat(id)));
	const lon = Number(strField(form, slotFormFields.weather.lon(id)));
	if (Number.isFinite(lat) && Number.isFinite(lon)) widget.mapCenter = { lat, lon };
	const zoom = Number(strField(form, slotFormFields.weather.mapZoom(id)));
	if (Number.isFinite(zoom) && zoom > 0) widget.mapZoom = Math.floor(zoom);
	if (form.get(slotFormFields.weather.showMap(id)) !== 'on') widget.showMap = false;
	const mapScope = strField(form, slotFormFields.weather.mapScope(id));
	if (mapScope) {
		widget.mapScopePowiaty = mapScope
			.split(',')
			.map((c) => c.trim())
			.filter(Boolean);
	}
	const detailsDisplay = strField(form, slotFormFields.weather.detailsDisplay(id));
	if (detailsDisplay === 'modal' || detailsDisplay === 'inline') widget.detailsDisplay = detailsDisplay;
	const detailsLayout = strField(form, slotFormFields.weather.detailsLayout(id));
	if (detailsLayout === 'stacked' || detailsLayout === 'grid') widget.detailsLayout = detailsLayout;
	const detailsSummary = strField(form, slotFormFields.weather.detailsSummary(id));
	if (detailsSummary) widget.detailsSummary = detailsSummary;
	const detailsCloseLabel = strField(form, slotFormFields.weather.detailsCloseLabel(id));
	if (detailsCloseLabel) widget.detailsCloseLabel = detailsCloseLabel;
}

function mergeSlotWidget(prior: DisplaySlot | undefined, widget: SlotWidgetConfig): SlotWidgetConfig | undefined {
	const merged = { ...prior?.widget, ...widget };
	return Object.keys(merged).length > 0 ? merged : undefined;
}

function formHasDisplayFields(form: FormData, slotId: string): boolean {
	const prefix = `display_${slotId}_`;
	for (const key of form.keys()) {
		if (String(key).startsWith(prefix)) return true;
	}
	return false;
}

function parseSlotsFromIdentities(
	form: FormData,
	identities: SlotIdentity[],
	existing: DisplaySlot[] = [],
): DisplaySlot[] {
	const seenSingletons = new Set<string>();
	const slots: DisplaySlot[] = [];

	for (let i = 0; i < identities.length; i++) {
		const { id, label, component, order } = identities[i]!;
		if (!id || !label || !isLayoutComponentId(component)) continue;
		if (isSingletonComponent(component)) {
			if (seenSingletons.has(component)) continue;
			seenSingletons.add(component);
		}

		const prior = existing.find((s) => s.id === id);
		const widget = parseBaseWidget(form, id, order ?? (i + 1) * 10);
		const kind = getComponentKind(component);

		if (kind === 'home_feed') parseHomeFeedWidget(form, id, widget);
		if (kind === 'local_feed') parseLocalFeedWidget(form, id, widget);
		if (kind === 'live_feed') parseLiveFeedWidget(form, id, component, widget);
		if (kind === 'chrome') parseChromeWidget(form, id, component, widget);
		if (kind === 'banner') {
			parseBannerWidget(form, id, widget);
			if (!validateBannerWidget(widget, label)) {
				if (prior) {
					slots.push({ ...prior, label });
				}
				continue;
			}
		}

		slots.push({
			id,
			label,
			component,
			widget: mergeSlotWidget(prior, widget),
			entries: component === 'sidebar.recent_changes' ? prior?.entries : undefined,
		});
	}
	return sortSlotsByOrder(slots);
}

function parseSlotsFromForm(form: FormData, existing: DisplaySlot[] = []): DisplaySlot[] {
	return parseSlotsFromIdentities(form, collectSlotIdentities(form), existing);
}

export function parseSlotsFromFormForZone(
	form: FormData,
	zone: LayoutZone,
	existing: DisplaySlot[] = [],
): DisplaySlot[] {
	const identities = collectSlotIdentities(form).filter(({ id }) => {
		const slotZone = strField(form, slotFormFields.zone(id));
		return slotZone === zone;
	});
	return parseSlotsFromIdentities(form, identities, existing);
}

function mergeSlotsFromForm(form: FormData, existing: DisplaySlot[]): DisplaySlot[] {
	const parsed = parseSlotsFromForm(form, existing);
	const parsedIds = new Set(parsed.map((s) => s.id));
	const preserved = existing.filter((s) => !parsedIds.has(s.id));
	return sortSlotsByOrder([...preserved, ...parsed]);
}

function parseCategoriesFromForm(form: FormData): CategoryDefinition[] {
	const slugs = form.getAll('category_slug').map((v) => String(v).trim());
	const names = form.getAll('category_name').map((v) => String(v).trim());
	const layouts = form.getAll('category_archive_layout').map((v) => String(v).trim());
	const columns = form.getAll('category_archive_columns').map((v) => String(v).trim());
	const categories: CategoryDefinition[] = [];

	for (let i = 0; i < slugs.length; i++) {
		const slug = slugs[i];
		const name = names[i] ?? '';
		if (!slug || !name) continue;
		const item: CategoryDefinition = { slug, name };
		applyCategoryArchiveFieldsFromForm(
			item,
			layouts[i] ?? 'tiles',
			columns[i] ?? '2',
		);
		if (item.archiveLayout === 'title-list') {
			delete item.archiveColumns;
		} else {
			delete item.archiveLayout;
			if (item.archiveColumns === 2) delete item.archiveColumns;
		}
		categories.push(item);
	}
	return categories;
}

function resolveNavHref(kind: string, value: string): string | undefined {
	const trimmed = value.trim();
	if (kind === 'none' || !kind) return undefined;
	if (kind === 'external') return trimmed || undefined;
	if (kind === 'category') {
		if (!trimmed) return undefined;
		return normalizeInternalHref(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
	}
	if (kind === 'page' || kind === 'static' || kind === 'custom') {
		if (!trimmed) return undefined;
		if (isExternalHref(trimmed)) return trimmed;
		return normalizeInternalHref(trimmed);
	}
	return undefined;
}

function resolveRowHrefValue(values: string[], rowIndex: number, rowCount: number): string {
	const direct = values[rowIndex]?.trim() ?? '';
	if (direct) return direct;
	if (values.length > rowCount) {
		const stride = Math.max(1, Math.floor(values.length / rowCount));
		for (let offset = 1; offset < stride; offset++) {
			const candidate = values[rowIndex + offset * rowCount]?.trim() ?? '';
			if (candidate) return candidate;
		}
	}
	return '';
}

export function parseNavigationFromForm(form: FormData): NavItem[] {
	const depths = strFields(form, 'nav_depth');
	const labels = strFields(form, 'nav_label');
	const kinds = strFields(form, 'nav_href_kind');
	const values = strFields(form, 'nav_href_value');
	const parents = strFields(form, 'nav_parent');
	const menuColumns = strFields(form, 'nav_menu_columns');
	const menuColWidth0 = strFields(form, 'nav_menu_col_width_0');
	const menuColWidth1 = strFields(form, 'nav_menu_col_width_1');

	if (labels.length === 0) return [];

	const rowCount = labels.length;
	const items: (NavItem | null)[] = new Array(rowCount).fill(null);
	const roots: NavItem[] = [];

	for (let i = 0; i < rowCount; i++) {
		const label = labels[i]?.trim();
		if (!label) continue;

		const depth = Math.min(2, Math.max(0, Number(depths[i] ?? 0) || 0));
		const item: NavItem = { label };
		const href = resolveNavHref(
			kinds[i] ?? 'none',
			resolveRowHrefValue(values, i, rowCount),
		);
		if (href) item.href = href;
		if (depth === 0) {
			applyNavDropdownFieldsFromForm(
				item,
				menuColumns[i] ?? '1',
				menuColWidth0[i] ?? '',
				menuColWidth1[i] ?? '',
			);
			if (item.menuColumns === 1 && !item.menuColumnWidths?.length) {
				delete item.menuColumns;
			}
		}
		items[i] = item;
	}

	for (let i = 0; i < rowCount; i++) {
		const item = items[i];
		if (!item) continue;

		const depth = Math.min(2, Math.max(0, Number(depths[i] ?? 0) || 0));
		const parentRaw = parents[i]?.trim() ?? '';

		if (depth === 0) {
			roots.push(item);
			continue;
		}

		if (!parentRaw) return [];
		const parentIndex = Number(parentRaw);
		if (!Number.isInteger(parentIndex) || parentIndex < 0 || parentIndex >= i) return [];

		const parentItem = items[parentIndex];
		if (!parentItem) return [];

		const parentDepth = Math.min(2, Math.max(0, Number(depths[parentIndex] ?? 0) || 0));
		if (parentDepth !== depth - 1) return [];

		if (!parentItem.children) parentItem.children = [];
		parentItem.children.push(item);
	}

	return roots;
}

function parseNavigationSection(form: FormData): NavItem[] | { error: 'invalid_navigation' } {
	const labels = strFields(form, 'nav_label');
	const hasTableRows = labels.some((label) => label.trim() !== '');
	const jsonFallback = String(form.get('navigation_json') ?? '').trim();

	if (hasTableRows) {
		const tableTree = parseNavigationFromForm(form);
		if (tableTree.length === 0) return { error: 'invalid_navigation' };

		if (jsonFallback) {
			try {
				const jsonTree = parseNavigationJson(jsonFallback);
				const tableHrefs = countNavigationHrefs(tableTree);
				const jsonHrefs = countNavigationHrefs(jsonTree);
				if (tableHrefs === 0 && jsonHrefs > 0) {
					return jsonTree;
				}
			} catch {
				// zostaw drzewo z tabeli
			}
		}

		return tableTree;
	}

	if (jsonFallback) {
		try {
			return parseNavigationJson(jsonFallback);
		} catch {
			return { error: 'invalid_navigation' };
		}
	}

	return { error: 'invalid_navigation' };
}

function parseCategoryDisplaysFromForm(
	form: FormData,
	slots: DisplaySlot[],
	categories: CategoryDefinition[],
	existing: SiteAstroLayout['categoryDisplays'],
): SiteAstroLayout['categoryDisplays'] {
	const base = mergeCategoryDisplays(slots, existing);
	for (const slot of slots) {
		if (!isCategoryFeedComponent(slot.component)) continue;
		if (!formHasDisplayFields(form, slot.id)) continue;
		base[slot.id] = categories
			.filter((c) => form.get(`display_${slot.id}_${c.slug}`) === 'on')
			.map((c) => c.slug);
	}
	return base;
}

function mergeZoneComponentsFromForm(
	form: FormData,
	zone: LayoutZone,
	existing: SiteAstroLayout,
): SiteAstroLayout['zones'] {
	const zones = resolveLayoutZones(existing);
	const existingZone = zones[zone].components;
	const parsed = parseSlotsFromForm(form, existingZone);
	const parsedIds = new Set(parsed.map((s) => s.id));
	const preserved = existingZone.filter((s) => !parsedIds.has(s.id));
	return mergeZoneComponents(zones, zone, sortSlotsByOrder([...preserved, ...parsed]));
}

export function mergeUnitRegistryZonesFromForm(
	form: FormData,
	existing: SiteAstroLayout,
): SiteAstroLayout['zones'] {
	let zones = resolveLayoutZones(existing);
	for (const zone of UNIT_COMPONENT_ZONES) {
		const existingZone = zones[zone].components;
		const parsed = parseSlotsFromFormForZone(form, zone, existingZone);
		const parsedIds = new Set(parsed.map((s) => s.id));
		const preserved = existingZone.filter((slot) => {
			if (parsedIds.has(slot.id)) return false;
			return classifyRegistryGroup(slot) === null;
		});
		zones = mergeZoneComponents(zones, zone, sortSlotsByOrder([...preserved, ...parsed]));
	}
	return zones;
}

export function mergeLayoutFromFormData(
	form: FormData,
	existing: SiteAstroLayout,
	section: LayoutFormSection,
): { ok: true; layout: SiteAstroLayout } | { ok: false; error: LayoutFormError } {
	let layout: SiteAstroLayout = { ...existing, zones: resolveLayoutZones(existing) };

	if (section === 'navigation' || section === 'all' || section === 'layout') {
		const navigation = parseNavigationSection(form);
		if ('error' in navigation) return { ok: false, error: navigation.error };
		layout.navEditorDepthColors = parseNavEditorDepthColorsFromForm(form);
		layout = syncNavigationInLayout(layout, navigation);
	}

	if (section === 'components' || section === 'all' || section === 'layout') {
		const layoutMode = String(form.get('layout_mode') ?? '').trim();
		const zoneRaw = String(form.get('layout_zone') ?? '').trim();
		if (layoutMode === 'unit_registry') {
			layout.zones = mergeUnitRegistryZonesFromForm(form, layout);
			layout.slots = flattenSlots(layout.zones);
		} else if (zoneRaw && isLayoutZone(zoneRaw)) {
			layout.zones = mergeZoneComponentsFromForm(form, zoneRaw, layout);
			layout.slots = flattenSlots(layout.zones);
		} else {
			const slots = mergeSlotsFromForm(form, layout.slots);
			if (slots.length === 0) return { ok: false, error: 'no_slots' };
			layout.slots = slots;
			layout.zones = migrateFlatSlotsToZones(slots);
		}
		if (flattenSlots(layout.zones).length === 0) return { ok: false, error: 'no_slots' };
	}

	if (section === 'categories' || section === 'all') {
		const categories = parseCategoriesFromForm(form);
		if (categories.length === 0) return { ok: false, error: 'no_categories' };
		layout.categories = categories;
		if (section === 'all') {
			layout.categoryDisplays = parseCategoryDisplaysFromForm(form, layout.slots, categories, {});
		} else {
			layout.categoryDisplays = mergeCategoryDisplays(existing.slots, existing.categoryDisplays);
			for (const slot of existing.slots) {
				if (!isCategoryFeedComponent(slot.component)) continue;
				const slugs = existing.categoryDisplays[slot.id] ?? [];
				layout.categoryDisplays[slot.id] = slugs.filter((slug) =>
					categories.some((c) => c.slug === slug),
				);
			}
		}
	}

	if (section === 'components') {
		layout.categoryDisplays = parseCategoryDisplaysFromForm(
			form,
			layout.slots,
			existing.categories,
			existing.categoryDisplays,
		);
	}

	layout = normalizeLayoutSlots(layout);
	return { ok: true, layout };
}

/** @deprecated Użyj mergeLayoutFromFormData z section=all */
export function parseLayoutFromFormData(
	form: FormData,
	base: Pick<SiteAstroLayout, 'navigationPath' | 'categoriesPath' | 'layoutPath'>,
): { ok: true; layout: SiteAstroLayout } | { ok: false; error: string } {
	const existing: SiteAstroLayout = {
		navigation: [],
		categories: [],
		categoryDisplays: {},
		zones: emptyZones(),
		slots: [],
		layoutPath: base.layoutPath,
		navigationPath: base.navigationPath,
		categoriesPath: base.categoriesPath,
	};
	const result = mergeLayoutFromFormData(form, existing, 'all');
	if (!result.ok) return result;
	return result;
}

export function parseLayoutSection(form: FormData, existing: SiteAstroLayout): ReturnType<typeof mergeLayoutFromFormData> {
	const raw = String(form.get('section') ?? 'all').trim();
	const section: LayoutFormSection =
		raw === 'navigation' ||
		raw === 'categories' ||
		raw === 'components' ||
		raw === 'layout' ||
		raw === 'all'
			? raw
			: 'all';
	return mergeLayoutFromFormData(form, existing, section);
}
