export type CityRecord = {
  id: string;
  sourceRecordId: string;
  nameEn: string;
  localNames: { value: string; language: string; sourceId: string }[];
  countryOrArea: { code: string; name: string; codeSystem: string };
  longitude: number;
  latitude: number;
  coordinateSourceId: string;
  coordinateMethod: string;
  population: number;
  referenceYear: number;
  valueStatus: 'estimate' | 'projection';
  definitionId: string;
  populationSourceId: string;
};
export type CityDataset = {
  schemaVersion: string;
  datasetVersion: string;
  coverage: 'sample' | 'full';
  thresholdPeople: number;
  referenceYear: number;
  cities: CityRecord[];
};
export type SourceManifest = {
  sources: { id: string }[];
  definitions: { id: string }[];
};
export type DisplayScale = {
  populationReference: number;
  heightReference: number;
  logReferencePeople: number;
};
export type CityManifest = {
  datasetVersion: string;
  coverage: 'sample' | 'full';
  eligibleCount: number;
  publishedCount?: number;
  disclosure: string;
  display: DisplayScale;
  sources: {
    id: string; publisher: string; title: string; url: string;
    sheet: string; columns: Record<string, string>; units: string;
    conversion: string; coordinateDatum: string; retrievedDate: string;
    sha256: string; license: string; licenseUrl: string; attribution: string;
    displayPrecisionPeople: number; displayPrecisionNote: string;
  }[];
  definitions: { id: string; label: string; description: string; url: string }[];
};
