/**
 * Powiaty województwa mazowieckiego (TERYT prefiks 14) — nazwy zgodne z PRG / GeoJSON.
 * Np. UG Miedzna: gmina 1433062, powiat 1433 (węgrowski), woj. 14.
 */
export const POWIATY_14: Record<string, string> = {
	'1401': 'powiat białobrzeski',
	'1402': 'powiat ciechanowski',
	'1403': 'powiat garwoliński',
	'1404': 'powiat gostyniński',
	'1405': 'powiat grodziski',
	'1406': 'powiat grójecki',
	'1407': 'powiat kozienicki',
	'1408': 'powiat legionowski',
	'1409': 'powiat lipski',
	'1410': 'powiat łosicki',
	'1411': 'powiat makowski',
	'1412': 'powiat miński',
	'1413': 'powiat mławski',
	'1414': 'powiat nowodworski',
	'1415': 'powiat ostrołęcki',
	'1416': 'powiat ostrowski',
	'1417': 'powiat otwocki',
	'1418': 'powiat piaseczyński',
	'1419': 'powiat płocki',
	'1420': 'powiat płoński',
	'1421': 'powiat pruszkowski',
	'1422': 'powiat przasnyski',
	'1423': 'powiat przysuski',
	'1424': 'powiat pułtuski',
	'1425': 'powiat radomski',
	'1426': 'powiat siedlecki',
	'1427': 'powiat sierpecki',
	'1428': 'powiat sochaczewski',
	'1429': 'powiat sokołowski',
	'1430': 'powiat szydłowiecki',
	'1432': 'powiat warszawski zachodni',
	'1433': 'powiat węgrowski',
	'1434': 'powiat wołomiński',
	'1435': 'powiat wyszkowski',
	'1436': 'powiat zwoleński',
	'1437': 'powiat żuromiński',
	'1438': 'powiat żyrardowski',
	'1461': 'powiat Ostrołęka',
	'1462': 'powiat Płock',
	'1463': 'powiat Radom',
	'1464': 'powiat Siedlce',
	'1465': 'powiat Warszawa',
};

export function powiatName14(code: string): string {
	return POWIATY_14[code] ?? `powiat ${code}`;
}
