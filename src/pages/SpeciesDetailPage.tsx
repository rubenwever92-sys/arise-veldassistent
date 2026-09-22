import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import type { Species } from '../types';
import {
  calcStillNeeded,
  statusConflicts,
  toDisplayStatus,
} from '../services/speciesLogic';
import { createCollection } from '../services/collections';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/date';

/** Detailpagina van één soort met status, barcodes en advies. */
export function SpeciesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [species, setSpecies] = useState<Species | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (!id) {
      setSpecies(null);
      return;
    }
    db.species.get(id).then((s) => {
      if (active) setSpecies(s ?? null);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (species === undefined) {
    return (
      <div className="page">
        <p className="muted">Bezig met laden...</p>
      </div>
    );
  }

  if (species === null) {
    return (
      <div className="page">
        <p className="muted">Soort niet gevonden.</p>
        <Link to="/search" className="btn">
          Terug naar zoeken
        </Link>
      </div>
    );
  }

  const display = toDisplayStatus(species.ariseStatus);
  const stillNeeded = calcStillNeeded(species.barcodeArise, species.collected);
  const conflict = statusConflicts(
    species.ariseStatus,
    species.barcodeArise,
    species.collected,
  );

  return (
    <div className="page species-detail">
      <Link to="/search" className="back-link">
        ← Zoeken
      </Link>

      <h1 className="species-name">{species.scientificName}</h1>
      <p className="species-taxon">
        {species.family || '-'} · {species.genus || '-'}
      </p>

      <div className="status-card">
        <StatusBadge status={display} />
        <div className="nmv-line">
          NMV PRIORITEIT: <strong>{species.nmvPriority ? 'JA' : 'NEE'}</strong>
        </div>
      </div>

      {conflict && (
        <div className="warning-box">
          Controleer actuele ARISE-status: de berekende behoefte en de officiële
          status komen niet overeen. De officiële ARISE-status is leidend.
        </div>
      )}

      <dl className="detail-grid">
        <div>
          <dt>Nederlandse/ARISE barcodes</dt>
          <dd>{species.barcodeArise ?? '-'}</dd>
        </div>
        <div>
          <dt>Andere barcodes</dt>
          <dd>{species.barcodeNonArise ?? '-'}</dd>
        </div>
        <div>
          <dt>Alle bekende barcodes</dt>
          <dd>{species.barcodeAll ?? '-'}</dd>
        </div>
        <div>
          <dt>Al verzameld</dt>
          <dd>{species.collected ?? '-'}</dd>
        </div>
        <div>
          <dt>Nog nodig</dt>
          <dd>{species.ariseStatus ? stillNeeded : '-'}</dd>
        </div>
        <div>
          <dt>NSR-status</dt>
          <dd>{species.nsrStatus || '-'}</dd>
        </div>
      </dl>

      <p className="import-line">
        ARISE gegevens bijgewerkt: {formatDate(species.lastAriseImport)}
      </p>
      <p className="source-line">Bron: lokaal geïmporteerde ARISE Targetlist</p>

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={async () => {
          const c = await createCollection(species);
          navigate(`/collections/${c.id}`);
        }}
      >
        NIEUWE COLLECTIE
      </button>
    </div>
  );
}
