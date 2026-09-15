import type { SupabaseClient } from '@supabase/supabase-js';
import { parseUsageRpc, type UsageStats } from './usage-model';

export async function loadUsageStats(supabase: SupabaseClient): Promise<UsageStats | null> {
	const { data, error } = await supabase.rpc('admin_usage_stats');
	if (error || data == null) return null;
	return parseUsageRpc(data);
}
