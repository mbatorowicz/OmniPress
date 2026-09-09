import type { SupabaseClient } from '@supabase/supabase-js';

export async function countPendingPosts(supabase: SupabaseClient): Promise<number> {
	const { count, error } = await supabase
		.from('posts')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'pending');
	if (error) return 0;
	return count ?? 0;
}
