import { describe, expect, it } from 'vitest';
import { parseCertAdvisoriesRss } from './parse-rss';

const SAMPLE_RSS = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
<channel>
<title>moje.cert.pl</title>
<item>
<title>🏦 Uwaga na oszustwa!</title>
<link>https://moje.cert.pl/komunikaty/2026/88/test/</link>
<description>&lt;p&gt;Obserwujemy kampanie phishingowe.&lt;/p&gt;</description>
<pubDate>Mon, 08 Jun 2026 14:24:28 +0000</pubDate>
<category>Dla użytkowników</category>
</item>
<item>
<title>Podatność w Gitea</title>
<link>https://moje.cert.pl/komunikaty/2026/83/gitea/</link>
<description>Informacja dla administratorów.</description>
<pubDate>Sun, 01 Jun 2026 10:00:00 +0000</pubDate>
<category>Dla administratorów</category>
</item>
</channel>
</rss>`;

describe('parseCertAdvisoriesRss', () => {
	it('parsuje pozycje RSS z kategorią i skrótem', () => {
		const entries = parseCertAdvisoriesRss(SAMPLE_RSS);
		expect(entries).toHaveLength(2);
		expect(entries[0].title).toContain('oszustwa');
		expect(entries[0].href).toBe('https://moje.cert.pl/komunikaty/2026/88/test/');
		expect(entries[0].category).toBe('Dla użytkowników');
		expect(entries[0].summary).toContain('phishingowe');
		expect(entries[1].category).toBe('Dla administratorów');
	});
});
