import type { CategoryDefinition, DisplaySlot } from '@/lib/astro-layout/types';

export type SlotSummaryLabels = {
	noCategories: string;
	categoriesPrefix: string;
	pinnedOnly: string;
	disabled: string;
	linkPrefix: string;
};

export function buildSlotSummaryChips(
	slot: DisplaySlot,
	categories: CategoryDefinition[],
	categoryDisplays: Record<string, string[]>,
	labels: SlotSummaryLabels,
): string[] {
	const w = slot.widget ?? {};
	const chips: string[] = [];

	if (w.enabled === false) {
		chips.push(`<span class="layout-slot-chip layout-slot-chip--muted">${labels.disabled}</span>`);
	}

	const kind = slot.component;
	if (kind === 'home.pinned' || kind === 'home.latest') {
		const slugs = categoryDisplays[slot.id] ?? [];
		if (slugs.length === 0) {
			chips.push(`<span class="layout-slot-chip layout-slot-chip--warn">${labels.noCategories}</span>`);
		} else {
			const names = slugs
				.map((slug) => categories.find((c) => c.slug === slug)?.name ?? slug)
				.join(', ');
			chips.push(`<span class="layout-slot-chip">${labels.categoriesPrefix} ${names}</span>`);
		}
		if (kind === 'home.pinned') {
			chips.push(`<span class="layout-slot-chip">${labels.pinnedOnly}</span>`);
		}
	}

	if (kind === 'sidebar.banner') {
		const linkType = w.linkType ?? 'category';
		if (linkType === 'category' && w.categorySlug) {
			const name = categories.find((c) => c.slug === w.categorySlug)?.name ?? w.categorySlug;
			chips.push(`<span class="layout-slot-chip">${labels.linkPrefix} ${name}</span>`);
		} else if (linkType === 'page' && w.pagePath) {
			chips.push(`<span class="layout-slot-chip">${labels.linkPrefix} ${w.pagePath}</span>`);
		} else if (linkType === 'external' && w.externalUrl) {
			chips.push(`<span class="layout-slot-chip">${labels.linkPrefix} ${w.externalUrl}</span>`);
		}
	}

	if (kind === 'sidebar.recent_changes') {
		const count = slot.entries?.length ?? 0;
		chips.push(`<span class="layout-slot-chip">${count} wpisów</span>`);
	}

	if (kind === 'topbar.tagline' && w.text) {
		chips.push(`<span class="layout-slot-chip">${w.text}</span>`);
	}

	return chips;
}

export function buildSlotSummaryHtml(
	slot: DisplaySlot,
	categories: CategoryDefinition[],
	categoryDisplays: Record<string, string[]>,
	labels: SlotSummaryLabels,
): string {
	return buildSlotSummaryChips(slot, categories, categoryDisplays, labels).join('');
}
