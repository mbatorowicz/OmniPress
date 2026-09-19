# Plan: Grok — forma treści, tytuł, podział i jednostka

**Status:** wdrożone w 0.18.0.  
**Role:** PM → Architect → BE → DevSecOps → QA

Szkic z poczty ma zachowywać się jak redaktor, nie jak importer plików. SSOT zachowania po wdrożeniu: [ADMIN.md](./ADMIN.md) §5.3, [WDROZENIE.md](./WDROZENIE.md), [STATUS.md](./STATUS.md).

## Diagnoza

Pipeline inbound robił **jeden** szkic (`title` / `category_slug` / `content_md`). PDF-y lądowały z `display_mode: link`. Pliki bez warstwy tekstowej (plakat-skan) nie trafiały do promptu Groka — stąd tytuł z tematu maila („Plakaty”) i ukrycie materiałów pod linkiem.

## Zasada: jak redaktor

Jednostka podziału to **komunikat dla odbiorcy strony**, nie liczba plików i nie pokrewieństwo dziedziny.

- Kilka ujęć tej samej sprawy (podtytuł, strona, format) → jeden wpis, wszystkie pokazane.
- Kilka spraw w jednym mailu → osobne wpisy, nawet gdy dziedzina jest pokrewna. Pokrewne słowo w treści nie skleja różnych nazw plików.
- Pismo przewodnie / pismo do służb i urzędu przy innych materiałach na stronę / „proszę opublikować” / „proszę poinformować mieszkańców” → ani w treści, ani jako załącznik, ani jako osobny wpis.
- Plakat, ulotka, zaproszenie → podgląd (`embed`).
- Uchwała, regulamin, lista → link.
- Kategoria: **Aktualności** na komunikat dla mieszkańców (plakat, sanepid, weterynaria). **Ochrona ludności** tylko na stałe materiały kryzysowe (alarmy, ewakuacja).
- Tytuł nazywa sprawę. Zakaz: `Plakaty`, `Załączniki`, `Informacja`, `Proszę o publikację`.
- Limit 1–3 szkice z jednego maila. Nie jeden wpis na plik. Nie dziel po podtytule.

Grok ocenia **konkretny zestaw** za każdym razem. W kodzie nie ma ścieżki „jeśli szczepienia i wścieklizna”.

## Jednostka: kto przekazał maila do Ciebie

Urzędnicy nie piszą nowej wiadomości — klikają Przekaż. Envelope From na `wpisy@inbound…` to administrator (allowlista + autor szkicu).

```
autor pisma → …przekazujący A → przekazujący B → do Ciebie → Ty na inbound
```

Przy wielu przekazujących liczy się wyłącznie **ostatni hop przed Tobą** (B). Nie głosujemy po łańcuchu. Autor pisma / najgłębszy From / pieczątka w PDF — ignorowane.

Mapa: dokładny adres (`INBOUND_SITE_BY_EMAIL`) → domena (`INBOUND_SITE_BY_DOMAIN`) → `INBOUND_DEFAULT_SITE_SLUG`. Nieznana domena → gmina. Szkoła tylko gdy hop do Ciebie ma domenę szkoły. Wszystkie szkice z jednego maila na tę samą jednostkę.

## Przykład (jeden z przypadków)

Trzy plakaty + pismo do urzędu: obowiązek szczepienia, dwa plakaty o wściekliźnie, pismo „proszę poinformować”. Oczekiwane: dwa szkice, plakaty jako podgląd, pismo `drop`.

## Poza zakresem

- OCR skanów
- poprawa już istniejącego szkicu
- publikacja na stronę (nadal tylko `draft`)
