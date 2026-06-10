import type { APIRoute } from 'astro';
import { runCronJob } from '@/lib/api/worker';
import { syncWeatherWarningsForAllSites } from '@/lib/weather/sync';
import { createServiceSupabase } from '@/lib/supabase/service';

export const GET: APIRoute = async ({ request }) =>
	runCronJob(request, async () => {
		const supabase = createServiceSupabase();
		return syncWeatherWarningsForAllSites(supabase);
	});
