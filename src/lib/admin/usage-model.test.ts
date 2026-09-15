import { describe, expect, it } from 'vitest';
import {
	classifyUsageKind,
	formatBytes,
	parseUsageRpc,
	storageShare,
} from './usage-model';

describe('formatBytes', () => {
	it('zeruje niepoprawne wartości', () => {
		expect(formatBytes(0)).toBe('0 B');
		expect(formatBytes(-3)).toBe('0 B');
	});

	it('formatuje progi 1024 w locale pl', () => {
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(1536)).toBe('1,5 KB');
		expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB');
		expect(formatBytes(1536 * 1024 * 1024)).toBe('1,5 GB');
	});
});

describe('storageShare', () => {
	it('liczy udział i zeruje puste wartości', () => {
		expect(storageShare(0, 100)).toBe('0%');
		expect(storageShare(25, 100)).toBe('25%');
		expect(storageShare(1, 100)).toBe('1%');
	});
});

describe('classifyUsageKind', () => {
	it('rozpoznaje zdjęcia, PDF i archiwa', () => {
		expect(classifyUsageKind('image/jpeg')).toBe('image');
		expect(classifyUsageKind('application/pdf')).toBe('pdf');
		expect(classifyUsageKind('application/zip')).toBe('archive');
	});

	it('rozpoznaje dokumenty po MIME i rozszerzeniu', () => {
		expect(classifyUsageKind('application/geopackage+sqlite3')).toBe('document');
		expect(classifyUsageKind('application/octet-stream', 'mapa.gpkg')).toBe('document');
		expect(classifyUsageKind('', 'uchwala.docx')).toBe('document');
	});
});

describe('parseUsageRpc', () => {
	it('odrzuca nieobiekt', () => {
		expect(parseUsageRpc(null)).toBeNull();
		expect(parseUsageRpc('x')).toBeNull();
	});

	it('agreguje MIME do rodzajów i liczy sumę', () => {
		const stats = parseUsageRpc({
			database_bytes: 1000,
			storage_bytes: 5000,
			storage_count: 3,
			by_mime: {
				'image/jpeg': { bytes: 4000, count: 2 },
				'application/pdf': { bytes: 1000, count: 1 },
			},
			largest: [{ filename: 'a.jpg', mime: 'image/jpeg', bytes: 3000 }],
		});
		expect(stats?.databaseBytes).toBe(1000);
		expect(stats?.totalBytes).toBe(6000);
		expect(stats?.kinds.find((k) => k.kind === 'image')).toEqual({
			kind: 'image',
			bytes: 4000,
			count: 2,
		});
		expect(stats?.largest).toEqual([{ filename: 'a.jpg', kind: 'image', bytes: 3000 }]);
	});
});
