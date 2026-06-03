import type { DestinationType, PublishLogStatus } from '@/lib/types';

export type PublishLogRow = {
	id: string;
	post_id: string;
	destination_id: string;
	status: PublishLogStatus;
	external_id: string | null;
	response_summary: string | null;
	retry_count: number;
	next_retry_at: string | null;
	published_at: string | null;
	created_at: string;
};

export type PostForPublish = {
	id: string;
	site_id: string;
	title: string;
	slug: string | null;
	content_md: string;
	status: string;
	updated_at?: string;
};

export type DestinationForPublish = {
	id: string;
	name: string;
	type: DestinationType;
	config: Record<string, unknown>;
	encrypted_credentials: string | null;
	is_active: boolean;
};

export type PublishResult =
	| { ok: true; externalId: string; summary: string }
	| { ok: false; summary: string; retryable: boolean };

export type WorkerRunResult = {
	processed: number;
	succeeded: number;
	failed: number;
	skipped: number;
};
