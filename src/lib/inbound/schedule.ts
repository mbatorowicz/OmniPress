import { waitUntil } from '@vercel/functions';

export function scheduleInboundIngest(
	task: Promise<unknown>,
	schedule?: (task: Promise<unknown>) => void,
): void {
	if (schedule) {
		schedule(task);
		return;
	}
	try {
		waitUntil(task);
	} catch {
		void task;
	}
}
