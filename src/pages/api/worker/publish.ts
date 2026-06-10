import type { APIRoute } from 'astro';
import { runCronJob } from '@/lib/api/worker';
import { runPublishWorkerJob } from '@/lib/publish/trigger-worker';

export const GET: APIRoute = async ({ request }) => runCronJob(request, runPublishWorkerJob);
