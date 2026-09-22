import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import { createBackup, readBackup, restoreBackup } from '../services/backup';
import { exportCollectionsCsv, exportCollectionsXlsx } from '../services/export';

type Status = { kind: 'idle' } | { kind: 'busy'; msg: string } | { kind: 'ok'; msg: string } | { kind: 'error'; msg: string };

/** Backup maken/herstellen en collecties exporteren. */
export function BackupPage() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const restoreRef = useRef<HTMLInputElement>(null);

  async function onBackup() {
    setStatus({ kind: 'busy', msg: 'Backup maken...' });
    try {
      await createBackup();
      setStatus({ kind: 'ok', msg: 'Backup gemaakt en gedownload.' });
    } catch (e) {
      setStatus({ kind: 'error', msg: msgOf(e) });
    }
  }

  async function onRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStatus({ kind: 'busy', msg: 'Backup controleren...' });
    try {
      const data = await readBackup(file);
      const ok = window.confirm(
        `Backup van ${new Date(data.exportedAt).toLocaleString('nl-NL')}.\n` +
          `${data.counts.species} soorten, ${data.counts.collections} collecties, ${data.counts.photos} foto's.\n\n` +
          'Alle huidige gegevens worden hiermee overschreven. Doorgaan?',
      );
      if (!ok) {
        setStatus({ kind: 'idle' });
        return;
      }
      setStatus({ kind: 'busy', msg: 'Backup terugzetten...' });
      await restoreBackup(file);
      setStatus({ kind: 'ok', msg: 'Backup teruggezet. Herlaad de app om alles te zien.' });
    } catch (err) {
      setStatus({ kind: 'error', msg: msgOf(err) });
    }
  }

  async function onExport(kind: 'xlsx' | 'csv') {
    setStatus({ kind: 'busy', msg: 'Exporteren...' });
    try {
      const collections = await db.collections.toArray();
      if (collections.length === 0) {
        setStatus({ kind: 'error', msg: 'Er zijn nog geen collecties om te exporteren.' });
        return;
      }
      collections.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      if (kind === 'xlsx') await exportCollectionsXlsx(collections);
      else await exportCollectionsCsv(collections);
      setStatus({ kind: 'ok', msg: 'Export gedownload.' });
    } catch (e) {
      setStatus({ kind: 'error', msg: msgOf(e) });
    }
  }

  const busy = status.kind === 'busy';

  return (
    <div className="page">
      <Link to="/settings" className="back-link">
        ← Instellingen
      </Link>
      <h1 className="app-title">Backup &amp; export</h1>

      {status.kind !== 'idle' && (
        <div
          className={
            status.kind === 'error'
              ? 'warning-box'
              : status.kind === 'ok'
                ? 'success-box'
                : 'muted'
          }
        >
          {status.msg}
        </div>
      )}

      <section className="settings-section">
        <h2>Backup maken</h2>
        <p className="muted small">
          Eén ZIP-bestand met alle gegevens en foto's. Bewaar dit veilig; het is
          je lokale reservekopie.
        </p>
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={onBackup}>
          BACKUP MAKEN
        </button>
      </section>

      <section className="settings-section">
        <h2>Backup terugzetten</h2>
        <p className="muted small">
          Het bestand wordt eerst gecontroleerd. Je moet bevestigen voordat
          bestaande gegevens worden overschreven.
        </p>
        <input
          ref={restoreRef}
          type="file"
          accept=".zip"
          className="hidden-file"
          onChange={onRestoreFile}
        />
        <button
          type="button"
          className="btn btn-block"
          disabled={busy}
          onClick={() => restoreRef.current?.click()}
        >
          BACKUP TERUGZETTEN
        </button>
      </section>

      <section className="settings-section">
        <h2>Collecties exporteren</h2>
        <p className="muted small">
          Sample ID, soortnaam, datum, checklist en notities. Foto's zitten niet
          in het exportbestand.
        </p>
        <button type="button" className="btn btn-block" disabled={busy} onClick={() => onExport('xlsx')}>
          EXPORTEREN NAAR XLSX
        </button>
        <button type="button" className="btn btn-block" disabled={busy} onClick={() => onExport('csv')}>
          EXPORTEREN NAAR CSV
        </button>
      </section>
    </div>
  );
}

function msgOf(e: unknown): string {
  return e instanceof Error ? e.message : 'Er is een fout opgetreden.';
}
