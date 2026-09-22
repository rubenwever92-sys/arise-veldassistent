import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db';
import type { Collection } from '../types';
import { checklistProgress, createCollection } from '../services/collections';
import { formatDate } from '../utils/date';

type Tab = 'open' | 'ready' | 'all';

/** Mijn collecties: filterbaar overzicht, nieuwste bovenaan. */
export function CollectionsPage() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>('open');
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function load() {
      const rows = await db.collections.toArray();
      rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setCollections(rows);

      const counts: Record<string, number> = {};
      for (const c of rows) {
        counts[c.id] = await db.photos.where('collectionId').equals(c.id).count();
      }
      setPhotoCounts(counts);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return collections.filter((c) => {
      if (tab === 'open' && c.status !== 'open') return false;
      if (tab === 'ready' && c.status !== 'ready') return false;
      if (!q) return true;
      return (
        c.scientificName.toLowerCase().includes(q) ||
        c.sampleId.toLowerCase().includes(q)
      );
    });
  }, [collections, tab, query]);

  async function onNew() {
    const c = await createCollection();
    navigate(`/collections/${c.id}`);
  }

  return (
    <div className="page">
      <h1 className="app-title">Mijn collecties</h1>

      <button type="button" className="btn btn-primary btn-block" onClick={onNew}>
        NIEUWE COLLECTIE
      </button>

      <input
        className="field-input"
        type="search"
        placeholder="Zoek op soort of Sample ID..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === 'open' ? 'active' : ''}`}
          onClick={() => setTab('open')}
        >
          Openstaand
        </button>
        <button
          type="button"
          className={`tab ${tab === 'ready' ? 'active' : ''}`}
          onClick={() => setTab('ready')}
        >
          Gereed
        </button>
        <button
          type="button"
          className={`tab ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          Alles
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="muted">Geen collecties in deze weergave.</p>
      ) : (
        <ul className="result-list">
          {filtered.map((c) => {
            const done = checklistProgress(c.checklist);
            const total = c.checklist.length;
            return (
              <li key={c.id}>
                <Link to={`/collections/${c.id}`} className="result-item">
                  <div className="result-main">
                    <span className="result-name">
                      {c.scientificName || '(geen soort)'}
                    </span>
                    <span className="result-sub">
                      {c.sampleId || 'geen Sample ID'} · {formatDate(c.date)}
                    </span>
                    <span className="result-sub">
                      {done}/{total} stappen · {photoCounts[c.id] ?? 0} foto&apos;s
                    </span>
                  </div>
                  <div className="result-side">
                    <span className={`chip ${c.status === 'ready' ? 'chip-ready' : ''}`}>
                      {c.status === 'ready' ? 'GEREED' : 'OPEN'}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
