# Nowa strona Gminy Miedzna

Przegląd dla pracowników Urzędu, kierownictwa i osób odpowiedzialnych za treści.

**Adres strony:** https://gmina-miedzna.pl  
**Uwagi:** mbatorowicz@gmail.com

---

## Geneza

Do września 2026 roku strona gminy działała na dotychczasowym systemie (WordPress). Adres był ten sam. Łatwo było o pomyłkę przy publikowaniu: kto miał hasło, ten mógł od razu pokazać tekst mieszkańcom. Strona bywała wolna, zwłaszcza na telefonie. Ostrzeżenia pogodowe i komunikaty o zagrożeniach trzeba było wstawiać ręcznie.

Nowa strona to **dwa repozytoria Git**, które pracują razem:

- **strona** (`gmina-miedzna.pl`) — Astro; to, co widzi mieszkaniec,
- **panel** (OmniPress) — tu redaktor pisze szkic; na stronę publiczną treść trafia dopiero po akceptacji.

**Jak przebiegały prace**

Kalendarz: **9 kwietnia – 16 września 2026** (ok. 5 miesięcy). Faktyczny zapis kodu: **39 dni**. Łącznie **805 commitów** (kolejnych, ponumerowanych wersji w Git):

| Repozytorium | Commity | Co zawiera |
|--------------|---------|------------|
| Panel OmniPress | 279 | logowanie, szkice, akceptacja, publikacja |
| Strona Astro | 526 | wygląd, widgety, treści; część to publikacje wpisów z panelu |

1. **Kwiecień** — pierwszy commit w repozytorium strony Astro. WordPress zostaje na produkcji; nowa strona powstaje obok.
2. **3 czerwca** — faza 1 panelu: Astro SSR, baza Supabase, logowanie. Potem ścieżka szkic → akceptacja → commit na GitHub → wdrożenie Vercel (artykuł u mieszkańca zwykle w minutę).
3. **Lato** — import z WordPressa (REST API): artykuły, strony stałe, menu, zdjęcia, banery. Widgety na żywo: IMGW i CERT. Czyszczenie śmieci po imporcie (shortcody, duble załączników).
4. **Wrzesień** — audyt bezpieczeństwa, audyt WCAG 2.1 AA, twardnienie przed startem. **16 września** — cutover DNS: adres **gmina-miedzna.pl** wskazuje nową stronę. Poczta urzędu, BIP i pozostałe usługi bez zmian.

Na stronie jest dziś około 98 artykułów i 38 stron stałych (władze, odpady, jednostki, druki i inne).

---

## Wstęp

Treści przyszły ze starej strony w takim stanie, w jakim tam były. Czy telefon jest aktualny, godziny urzędowania właściwe, a baner nadal potrzebny — wie osoba z urzędu.

Prosimy o przegląd **swojej** części strony w najbliższych dniach. Nie trzeba znać się na komputerach. Wystarczy wiedzieć, jak jest w urzędzie, i napisać, co poprawić.

---

## Rozwinięcie

### Korzyści z nowego systemu

Adres i przeniesione treści zostały. Urząd zyskuje bezpieczniejsze publikowanie, szybsze wyjście komunikatu do mieszkańców, automatyczne ostrzeżenia i narzędzia dostępności wymagane ustawą.

**Bezpieczeństwo**

Strona dla mieszkańców nie ma już panelu WordPressa pod adresem gminy. Nie ma też wtyczek, które trzeba regularnie łatać i które bywają furtką do włamania. Logowanie jest tylko w osobnym panelu, z kontem nadawanym przez administratora.

Artykuł nie ukazuje się publicznie, dopóki ktoś go nie zaakceptuje. Mniej pomyłek i mniejsze ryzyko, że na stronę trafi treść nieprzeznaczona dla mieszkańców.

**Szybkość reakcji**

Po akceptacji artykuł pojawia się na **gmina-miedzna.pl** zwykle w ciągu minuty. Komunikat o przerwie w wodzie, odwołaniu imprezy albo pilnym ogłoszeniu nie czeka na wolny termin przy starym systemie. Można też ustawić datę i godzinę publikacji — na przykład na rano, a nie wieczorem.

**Astro zamiast WordPressa**

Nowa strona jest zbudowana na **Astro**. To inny sposób robienia stron niż WordPress: strona dla mieszkańców jest lekka i osobna od panelu do pisania.

| WordPress | Astro |
|-----------|--------|
| Wtyczki i częste aktualizacje; awaria albo dziura w dodatku potrafi zatrzymać całą stronę | Bez wtyczek. Mniej okazji do ataku i do tego, że „po aktualizacji nic nie działa” |
| Przy każdym wejściu strona składa się z bazy — bywa wolna, zwłaszcza na telefonie | Gotowa, lżejsza strona. Szybciej się otwiera |
| Panel do logowania pod tym samym adresem co strona gminy | Mieszkaniec widzi stronę. Redaktor pracuje w osobnym panelu |
| Kto ma hasło, ten może od razu pokazać tekst mieszkańcom | Najpierw szkic, potem akceptacja, potem strona — zwykle w minutę |

Panel i strona to dwa osobne repozytoria Git. Po akceptacji panel robi commit w repozytorium strony na GitHubie; Vercel buduje nową wersję. Mieszkaniec nie loguje się nigdzie.

**CERT — ochrona przed oszustwem**

W prawej kolumnie strony głównej są komunikaty **CERT Polska** (państwowy zespół ds. cyberbezpieczeństwa). Chodzi o fałszywe maile, SMS-y i strony, które podszywają się pod urząd, bank, e-Doręczenia albo „dopłatę do odpadów”. Mieszkaniec może tam sprawdzić, czy wezwanie do zapłaty to znane oszustwo. Komunikaty wchodzą same — nikt w urzędzie nie musi ich wklejać.

**IMGW — ostrzeżenia pogodowe**

Moduł **IMGW** pokazuje aktualne ostrzeżenia Instytutu Meteorologii i Gospodarki Wodnej dla gminy: burze, upał, mróz, silny wiatr. Też bez ręcznego wpisywania. Przy groźnej pogodzie mieszkaniec widzi to na stronie gminy.

**Dostępność — WCAG**

**WCAG** (Web Content Accessibility Guidelines) to międzynarodowe wytyczne, jak robić strony tak, żeby mogły z nich korzystać także osoby słabowidzące, niewidome, starsze albo obsługujące komputer samą klawiaturą. W Polsce strony urzędów obejmuje [ustawa z 4 kwietnia 2019 r. o dostępności cyfrowej](https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20190000848).

16 września 2026 r. zrobiono wewnętrzny przegląd (audyt) nowej strony i panelu według WCAG 2.1 na poziomie AA — to poziom wymagany od urzędów. Na stronie jest pasek: kontrast i wielkość liter. Jest też [deklaracja dostępności](https://gmina-miedzna.pl/gmina/deklaracja-dostepnosci).

Status dziś: **częściowo zgodna**. Powód: archiwalne PDF-y i skany ze starej strony oraz brak jeszcze badania przez zewnętrzny podmiot. To wymóg ustawy.

### Jak treść trafia na stronę

**Artykuły** (aktualności, komunikaty, zarządzenia):

1. Redaktor loguje się do panelu i przygotowuje szkic (tekst, zdjęcia, pliki).
2. Klika **Wyślij do akceptacji**.
3. Osoba akceptująca zatwierdza wpis albo odsyła do poprawki.
4. Po zatwierdzeniu artykuł pojawia się na **https://gmina-miedzna.pl** — zwykle w ciągu minuty. Można ustawić datę i godzinę publikacji.

Redaktor nie publikuje artykułu samodzielnie. Do starego systemu się już nie logujemy.

**Strony stałe** (kontakt, władze, odpady, szkoła, przedszkole, GOPS, biblioteka) oraz **menu i pasek z prawej** zmienia administrator — na wniosek z urzędu.

Panel: **https://omni-press.cncsolutions.dev**  
Konto zakłada administrator. Instrukcja jest w panelu, pod przyciskiem *Pomoc*.

### Co zrobić

1. Wejdź na **https://gmina-miedzna.pl**.
2. Obejrzyj **swoją** działkę — nie całą stronę.
3. Napisz **jednego** maila na **mbatorowicz@gmail.com**.

Jeśli treść jest w porządku, też prosimy o jedno zdanie, na przykład: „Kontakt / odpady / szkoła — sprawdziłem, jest w porządku”.

### Szablon wiadomości

**Do:** mbatorowicz@gmail.com  
**Temat:** Strona gminy — uwaga (np. Kontakt / odpady / pasek boczny)

W treści:

```
Link: https://gmina-miedzna.pl/...
Co jest: (jedno zdanie)
Jak powinno być: (jedno zdanie)
```

Kilka spraw w jednym mailu jest w porządku. Przy każdej: link, co jest, jak powinno. Literówki można zebrać w jednym wykazie. Zdjęcie ekranu pomaga, ale nie jest potrzebne.

### Kto co ogląda

Nie wszyscy oglądają wszystko.

**Wszyscy (kilka minut)**  
Strona główna (w tym komunikaty CERT i ostrzeżenia IMGW z prawej), górne menu, strona [Kontakt](https://gmina-miedzna.pl/kontakt).

**Kierownictwo**  
[Wójt](https://gmina-miedzna.pl/gmina/wojt), [zastępca](https://gmina-miedzna.pl/gmina/zastepca-wojta), [sekretarz](https://gmina-miedzna.pl/gmina/sekretarz), [skarbnik](https://gmina-miedzna.pl/gmina/skarbnik), [rada i radni](https://gmina-miedzna.pl/gmina/radni-2024-2029), [struktura urzędu](https://gmina-miedzna.pl/gmina/struktura).

**Odpady, ochrona ludności, inwestycje, jednostki**  
Tylko swoje strony: gospodarka odpadami, ochrona ludności, szkoła, przedszkole, GOPS, biblioteka.

**Osoby od treści na stronie**  
Czy artykuły są we właściwej kategorii, czy nie wiszą powtórzenia, czy stare komunikaty nie wyglądają jak aktualne.

Jeśli nie wiadomo, od czego zacząć: strona główna, potem **swoje** menu, na końcu Kontakt.

### Na co zwrócić uwagę

**Treści i strony**

- Czy tekst jest zrozumiały i aktualny?
- Czy zdjęcia są właściwe (nie cudze, nie sprzed kilku kadencji bez opisu)?
- Czy artykuł jest w dobrej kategorii i we właściwym miejscu w menu?
- Czy strona nie jest pusta, urwana albo z datą, która już nie obowiązuje?

**Kontakt** — [https://gmina-miedzna.pl/kontakt](https://gmina-miedzna.pl/kontakt)

Prosimy sprawdzić:

- adres: ul. 11 Listopada 4, 07-106 Miedzna
- telefony: (0-25) 691-83-27, (0-25) 691-83-28
- e-mail: sekretariat@gmina-miedzna.pl
- godziny: „Pracujemy od 7.30 do 15.30”
- ePUAP i e-Doręczenia
- numery rachunków (główny i odpady)
- dwa NIP-y: Gmina i Urząd — czy tak ma zostać na fakturze

**Pasek z prawej strony** (ok. 20 elementów)

Banery przyszły ze starej strony. Które są nadal potrzebne, a które można schować? Wystarczy napisać o tych, które dotyczą danej działki albo których urząd już nie używa.

Są tam m.in.: ostrzeżenia pogody, CERT, SMS, ochrona ludności, Mazowsze bez smogu, Unia Europejska, fundusze drogowe, ePUAP, KRUS, LGD, dwa podobne banery EFRR i kilka innych.

**Kategorie artykułów** (jest ich 10)

Aktualności · Gmina · Gospodarka odpadami · Plan ogólny Gminy Miedzna · Zarządzenia · Ochrona ludności · Mazowsze bez smogu · Dofinansowano ze środków Rządowego Funduszu Rozwoju Dróg · Państwowy Fundusz Celowy · Inwestycje

Które są na co dzień potrzebne? Które można połączyć albo zostawić jako zwykłą stronę, a nie osobną kategorię?

### Pytania do urzędu

Przy okazji przeglądu urząd może rozstrzygnąć:

1. **Pasek boczny jest długi.** Dwa banery EFRR wyglądają podobnie. Co zostaje, co schodzimy?
2. **W stopce jest zapowiedź mapy dojazdu**, a na stronie Kontakt mapy nie ma. Czy dodać mapę?
3. **Nazwy niektórych kategorii są bardzo długie** (fundusze). Czy to nadal kategorie artykułów, czy raczej zwykłe strony z opisem?
4. **BIP** zostaje pod osobnym adresem, jak dotychczas. Czy link w menu jest właściwy?

Odpowiedź może być krótka: „zostawić” / „usunąć” / „zmienić na…”.

### Czego nie robić

- Logować się do starego systemu — pod adresem gminy go już nie ma.
- Poprawiać strony poza panelem. Wystarczy mail — zmianę wprowadzimy we właściwym miejscu.
- Wysyłać osobnego maila na każdą literówkę. Jeden zbiorczy wykaz wystarczy.
- Przeglądać całej strony, jeśli odpowiada się za jeden wydział.

---

## Zakończenie

Mieszkańcy korzystają już z **gmina-miedzna.pl**. Nowa strona jest szybsza, bezpieczniejsza w publikowaniu i pokazuje ostrzeżenia CERT oraz IMGW. Prosimy, żeby w najbliższych dniach spojrzeć na swoją część i napisać, co poprawić — albo że jest w porządku.

Uwagi zbiera: **mbatorowicz@gmail.com**.
