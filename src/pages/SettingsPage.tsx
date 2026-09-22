import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db';
import type { ImportRecord } from '../types';
import { formatDate } from '../utils/date';

/** Instellingen: importhistorie en ARISE Targetlist bijwerken. */
export function SettingsPage() {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function loadImports() {
    const rows = await db.imports.toArray();
    rows.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    setImports(rows);
  }

  useEffect(() => {
    loadImports();
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      e.target.value = '';
    }
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      // Lazy import zodat de xlsx-parser buiten het hoofdbundel blijft.
      const { applyAriseImport } = await import(
        '../services/import/applyAriseImport'
      );
      const result = await applyAriseImport(buffer, file.name);
      await loadImports();
      navigate('/import', { state: result });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Onbekende fout bij het importeren.',
      );
    } finally {
      setBusy(false);
    }
  }

  const nmv = imports.filter((i) => i.type === 'nmv');
  const arise = imports.filter((i) => i.type === 'arise');

  return (
    <div className="page">
      <h1 className="app-title">Instellingen</h1>

      <section className="settings-section">
        <h2>ARISE Targetlist bijwerken</h2>
        <p className="muted small">
          Kies een lokale export (XLSX, XLS of CSV). Het bestand wordt uitsluitend
          lokaal verwerkt en nergens geüpload. Collecties, foto's en notities
          blijven behouden.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden-file"
          onChange={onFile}
        />
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? 'Bezig met importeren...' : 'ARISE TARGETLIST BIJWERKEN'}
        </button>
        {error && <div className="warning-box">{error}</div>}
      </section>

      <section className="settings-section">
        <h2>Importhistorie</h2>

        <h3>NMV Priority list</h3>
        {nmv.length === 0 ? (
          <p className="muted">Nog geen NMV-import.</p>
        ) : (
          nmv.map((i) => (
            <p key={i.id} className="import-entry">
              {i.fileName}
              <br />
              {i.speciesCount} soorten · {formatDate(i.importedAt)}
            </p>
          ))
        )}

        <h3>ARISE Targetlist</h3>
        {arise.length === 0 ? (
          <p className="muted">Nog geen ARISE-import.</p>
        ) : (
          arise.map((i) => (
            <p key={i.id} className="import-entry">
              {i.fileName}
              <br />
              {i.speciesCount} fungi · {formatDate(i.importedAt)}
            </p>
          ))
        )}
      </section>

      <section className="settings-section">
        <h2>Backup &amp; export</h2>
        <p className="muted small">
          Maak een reservekopie, zet er één terug of exporteer je collecties.
        </p>
        <Link to="/backup" className="btn btn-block">
          BACKUP &amp; EXPORT
        </Link>
      </section>
    </div>
  );
}
