// Centrale TypeScript-types voor de ARISE Veldassistent.

/** Genormaliseerde ARISE-status voor weergave in de interface. */
export type AriseDisplayStatus = 'PRIORITY' | 'WANTED' | 'NIET NODIG' | 'ONBEKEND';

/** Originele ARISE Species status zoals aangeleverd in de targetlist. */
export type AriseRawStatus = 'Priority' | 'Wanted' | 'Unwanted' | string;

/** Soortrecord zoals opgeslagen in IndexedDB. */
export interface Species {
  /** Stabiele interne id, afgeleid van de genormaliseerde wetenschappelijke naam. */
  id: string;
  scientificName: string;
  /** Genormaliseerde naam voor zoeken/koppelen (lowercase, getrimd). */
  normalizedName: string;
  genus: string;
  family: string;
  /** Status in Nederlands Soortenregister (NSR). */
  nsrStatus: string;
  /** Staat de soort op de NMV-prioriteitenlijst. */
  nmvPriority: boolean;
  /** Originele ARISE Species status, indien geïmporteerd. */
  ariseStatus: AriseRawStatus | null;
  barcodeAll: number | null;
  barcodeArise: number | null;
  barcodeNonArise: number | null;
  collected: number | null;
  locality: string;
  /** ISO-datum van de laatste ARISE-import die deze soort raakte. */
  lastAriseImport: string | null;
  /** Herkomst van het record: 'nmv', 'arise' of 'both'. */
  source: SpeciesSource;
}

export type SpeciesSource = 'nmv' | 'arise' | 'both';

/** Standaard-checklistitem binnen een collectie. */
export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export type CollectionStatus = 'open' | 'ready';

/** Door de gebruiker aangemaakte veldcollectie. */
export interface Collection {
  id: string;
  speciesId: string | null;
  scientificName: string;
  sampleId: string;
  /** ISO-datum van de vondst. */
  date: string;
  notes: string;
  checklist: ChecklistItem[];
  status: CollectionStatus;
  createdAt: string;
  updatedAt: string;
}

/** Foto gekoppeld aan een collectie, lokaal opgeslagen als Blob. */
export interface Photo {
  id: string;
  collectionId: string;
  blob: Blob;
  fileName: string;
  createdAt: string;
}

/** Sleutel/waarde-instellingen. */
export interface Setting {
  key: string;
  value: unknown;
}

export type ImportType = 'nmv' | 'arise';

/** Historie-record van een uitgevoerde import. */
export interface ImportRecord {
  id: string;
  type: ImportType;
  fileName: string;
  speciesCount: number;
  importedAt: string;
}
