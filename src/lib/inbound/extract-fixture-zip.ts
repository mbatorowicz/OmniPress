function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of data) {
		crc ^= byte;
		for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
	const buf = new Uint8Array(2);
	new DataView(buf.buffer).setUint16(0, value, true);
	return buf;
}

function u32(value: number): Uint8Array {
	const buf = new Uint8Array(4);
	new DataView(buf.buffer).setUint32(0, value, true);
	return buf;
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((sum, p) => sum + p.byteLength, 0));
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.byteLength;
	}
	return out;
}

/** ZIP method store (bez kompresji) — wystarczy do minimalnego DOCX w testach. */
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
	const locals: Uint8Array[] = [];
	const centrals: Uint8Array[] = [];
	let offset = 0;
	const encoder = new TextEncoder();
	for (const file of files) {
		const name = encoder.encode(file.name);
		const crc = crc32(file.data);
		const header = concatBytes([
			u32(0x04034b50),
			u16(20),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(crc),
			u32(file.data.byteLength),
			u32(file.data.byteLength),
			u16(name.byteLength),
			u16(0),
			name,
			file.data,
		]);
		locals.push(header);
		centrals.push(
			concatBytes([
				u32(0x02014b50),
				u16(20),
				u16(20),
				u16(0),
				u16(0),
				u16(0),
				u16(0),
				u32(crc),
				u32(file.data.byteLength),
				u32(file.data.byteLength),
				u16(name.byteLength),
				u16(0),
				u16(0),
				u16(0),
				u16(0),
				u32(0),
				u32(offset),
				name,
			]),
		);
		offset += header.byteLength;
	}
	const localBytes = concatBytes(locals);
	const centralBytes = concatBytes(centrals);
	return concatBytes([
		localBytes,
		centralBytes,
		concatBytes([
			u32(0x06054b50),
			u16(0),
			u16(0),
			u16(files.length),
			u16(files.length),
			u32(centralBytes.byteLength),
			u32(localBytes.byteLength),
			u16(0),
		]),
	]);
}
