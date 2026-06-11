export const OSMET_TERYT_URL =
	'https://meteo.imgw.pl/api/meteo/messages/v1/osmet/latest/osmet-teryt';

export const WEATHER_WARNINGS_CACHE_TTL_MS = 15 * 60 * 1000;

export type WeatherWarningLevel = 1 | 2 | 3;

export type WeatherAffectedPowiat = {
	code: string;
	name: string;
	isLocal: boolean;
};

export type WeatherWarning = {
	id: string;
	level: WeatherWarningLevel;
	phenomenonCode: string;
	phenomenon: string;
	probability: string;
	validFrom: string;
	validTo: string;
	content: string;
	comments: string;
	sms: string;
	office: string;
	rcb: boolean;
	publishedAt: string;
	affectedPowiaty: WeatherAffectedPowiat[];
	affectsLocalPowiat: boolean;
};

export type WeatherWarningsFile = {
	updatedAt: string;
	source: 'IMGW-PIB';
	config: {
		terytPowiat: string;
		mapCenter: { lat: number; lon: number };
		mapZoom: number;
		showMap: boolean;
		mapScopePowiaty: string[];
	};
	active: WeatherWarning[];
	terytLevels: Record<string, number>;
	/** Powiaty objęte aktywnymi ostrzeżeniami — do kolorowania mapy. */
	mapHighlight: string[];
	/** Pełny zasięg widoku mapy (ostrzeżenia + opcjonalni sąsiedzi). */
	mapScope: string[];
};

export type OsmetWarning = {
	Level: string;
	PhenomenonCode?: string;
	PhenomenonName: string;
	Probability?: number | string;
	Content: string;
	Comments?: string;
	SMS?: string;
	Name2?: string;
	Rcb?: number | boolean;
	ValidFrom: string;
	ValidTo: string;
	ReleaseDateTime?: string;
	LxValidFrom?: string;
	LxValidTo?: string;
	LxReleaseDateTime?: string;
};

export type OsmetTerytResponse = {
	warnings: Record<string, OsmetWarning>;
	teryt: Record<string, string[]>;
	program?: {
		LxExportTime?: string;
		ExportTime?: string;
	};
};

