import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import type { Species } from '../types';
import { rankSpecies } from '../services/search';
import { toDisplayStatus } from '../services/speciesLogic';
import { StatusBadge } from '../components/StatusBadge';

/** Zoekscherm: grote zoekbalk met live resultaten, volledig offline. */
export function SearchPage() {
  const [term, setTerm] = useState('');
  const [all, setAll] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    db.species.toArray().then((rows) => {
      if (!active) return;
      setAll(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => rankSpecies(all, term), [all, term]);

  const counts = useMemo(() => {
    let nmv = 0;
    let ariseActive = 0;
    for (const s of all) {
      if (s.nmvPriority) nmv++;
      const d = toDisplayStatus(s.ariseStatus);
      if (d === 'PRIORITY' || d === 'WANTED') ariseActive++;
    }
    return { nmv, ariseActive };
  }, [all]);

  return (
    <div className="page search-page">
      <h1 className="app-title">ARISE Veldassistent</h1>

      <input
        ref={inputRef}
        className="search-box"
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Zoek wetenschappelijke naam, genus of familie..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />

      {!term && (
        <div className="counters">
          <div className="counter">
            <span className="counter-value">{counts.nmv}</span>
            <span className="counter-label">NMV prioriteitssoorten</span>
          </div>
          <div className="counter">
            <span className="counter-value">{counts.ariseActive}</span>
            <span className="counter-label">ARISE Wanted/Priority</span>
          </div>
        </div>
      )}

      {loading && <p className="muted">Bezig met laden...</p>}

      {!loading && term && results.length === 0 && (
        <p className="muted">Geen soorten gevonden voor "{term}".</p>
      )}

      <ul className="result-list">
        {results.map((s) => (
          <li key={s.id}>
            <Link to={`/species/${s.id}`} className="result-item">
              <div className="result-main">
                <span className="result-name">{s.scientificName}</span>
                <span className="result-sub">
                  {s.genus}
                  {s.family ? ` · ${s.family}` : ''}
                </span>
              </div>
              <div className="result-side">
                {s.ariseStatus && <StatusBadge status={toDisplayStatus(s.ariseStatus)} />}
                {s.nmvPriority && <span className="chip">NMV</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
