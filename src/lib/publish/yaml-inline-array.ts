/** Jednolinijkowa tablica YAML: `key: ["a", "b"]`. */

export function parseYamlQuotedStringArray(line: string, key: string): string[] | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith(`${key}:`)) return null;
	const inner = trimmed.match(new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`));
	if (!inner) return [];
	return [...inner[1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!).filter(Boolean);
}

export function formatYamlQuotedStringArray(values: readonly string[]): string {
	return `[${values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(', ')}]`;
}
