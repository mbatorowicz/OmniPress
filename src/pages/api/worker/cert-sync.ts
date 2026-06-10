import type { APIRoute } from 'astro';
import { runCronJob } from '@/lib/api/worker';
import { syncCertAdvisoriesForAllSites } from '@/lib/cert/sync';
import { createServiceSupabase } from '@/lib/supabase/service';

export const GET: APIRoute = async ({ request }) =>
	runCronJob(request, async () => {
		const supabase = createServiceSupabase();
		return syncCertAdvisoriesForAllSites(supabase);
	});
