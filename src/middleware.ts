import { defineMiddleware } from 'astro:middleware';
import { runMiddlewarePipeline } from '@/lib/middleware/pipeline';

export const onRequest = defineMiddleware(runMiddlewarePipeline);
