import type { CertAdvisory } from './types';
import type { CertAdvisoriesWidgetConfig } from '@/lib/astro-layout/types';

export function filterCertAdvisories(
	entries: CertAdvisory[],
	config?: CertAdvisoriesWidgetConfig,
): CertAdvisory[] {
	let filtered = entries;

	if (config?.categoryFilter?.trim()) {
		const filter = config.categoryFilter.trim();
		filtered = filtered.filter((entry) => entry.category === filter);
	}

	const limit = config?.limit && config.limit > 0 ? Math.floor(config.limit) : 5;
	return filtered.slice(0, limit);
}
