import type { EnrichOutcome } from './enrich-outcome';
import { countMessageClusters, type ClusterFile } from './message-clusters';

/** Jeden szkic przy kilku sprawach w przesyłce — Grok skleił, trzeba drugiej tury. */
export function needsSplitRetry(outcome: EnrichOutcome, files: ClusterFile[]): boolean {
	if (outcome.kind !== 'create') return false;
	if (outcome.drafts.length !== 1) return false;
	return countMessageClusters(files) >= 2;
}

/** Druga tura tylko gdy naprawdę rozdzieliła. Clarify/1 szkic nie nadpisuje pierwszego odczytu. */
export function pickSplitRetryOutcome(first: EnrichOutcome, second: EnrichOutcome): EnrichOutcome {
	if (second.kind === 'create' && second.drafts.length > 1) return second;
	return first;
}
