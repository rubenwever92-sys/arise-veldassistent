import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import type { Collection, Photo } from '../types';
import {
  checklistProgress,
  deleteCollection,
  isReady,
  saveCollection,
} from '../services/collections';
import { addPhoto, deletePhoto, getPhotos } from '../services/photos';
import { QrScanner } from '../components/QrScanner';

/** Detailpagina van één collectie met automatische opslag. */
export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [collection, setCollection] = useState<Collection | null | undefined>(undefined);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saved, setSaved] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | null>(null);
  const savedTimer = useRef<number | null>(null);
  // Laatste onopgeslagen versie, zodat we bij verlaten van de pagina kunnen flushen.
  const pendingRef = useRef<Collection | null>(null);

  useEffect(() => {
    if (!id) return;
    db.collections.get(id).then((c) => setCollection(c ?? null));
    getPhotos(id).then(setPhotos);
  }, [id]);

  // Automatisch opslaan met een korte debounce.
  const scheduleSave = useCallback((next: Collection) => {
    pendingRef.current = next;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const stored = await saveCollection(next);
      pendingRef.current = null;
      setCollection(stored);
      setSaved(true);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSaved(false), 1500);
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      // Nog niet weggeschreven wijziging alsnog opslaan.
      if (pendingRef.current) {
        void saveCollection(pendingRef.current);
        pendingRef.current = null;
      }
    };
  }, []);

  function update(patch: Partial<Collection>) {
    setCollection((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      scheduleSave(next);
      return next;
    });
  }

  function toggleChecklist(key: string) {
    setCollection((prev) => {
      if (!prev) return prev;
      const checklist = prev.checklist.map((c) =>
        c.key === key ? { ...c, done: !c.done } : c,
      );
      const next = { ...prev, checklist };
      scheduleSave(next);
      return next;
    });
  }

  async function onPhotoFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !id) return;
    setPhotoBusy(true);
    try {
      for (const file of Array.from(files)) {
        await addPhoto(id, file);
      }
      setPhotos(await getPhotos(id));
    } finally {
      setPhotoBusy(false);
      e.target.value = '';
    }
  }

  async function removePhoto(photoId: string) {
    await deletePhoto(photoId);
    if (id) setPhotos(await getPhotos(id));
  }

  async function onDelete() {
    if (!id) return;
    if (!window.confirm('Deze collectie en bijbehorende foto\u0027s verwijderen?')) return;
    await deleteCollection(id);
    navigate('/collections');
  }

  if (collection === undefined) {
    return (
      <div className="page">
        <p className="muted">Bezig met laden...</p>
      </div>
    );
  }
  if (collection === null) {
    return (
      <div className="page">
        <p className="muted">Collectie niet gevonden.</p>
        <Link to="/collections" className="btn">
          Terug naar collecties
        </Link>
      </div>
    );
  }

  const done = checklistProgress(collection.checklist);
  const total = collection.checklist.length;
  const ready = isReady(collection.checklist);

  return (
    <div className="page collection-detail">
      <Link to="/collections" className="back-link">
        ← Collecties
      </Link>

      <div className="save-row">
        <span className={`save-indicator ${saved ? 'visible' : ''}`}>Opgeslagen</span>
      </div>

      <div className={`ready-card ${ready ? 'ready' : ''}`}>
        <strong>
          {done} van {total} stappen voltooid
        </strong>
        <span>{ready ? 'COLLECTIE GEREED' : 'Collectie is nog niet gereed.'}</span>
      </div>

      <label className="field">
        <span className="field-label">Wetenschappelijke soortnaam</span>
        <input
          className="field-input"
          value={collection.scientificName}
          onChange={(e) => update({ scientificName: e.target.value })}
          placeholder="Wetenschappelijke naam"
        />
      </label>

      <label className="field">
        <span className="field-label">Datum</span>
        <input
          type="date"
          className="field-input"
          value={collection.date}
          onChange={(e) => update({ date: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field-label">QR / Sample ID</span>
        <input
          className="field-input"
          value={collection.sampleId}
          onChange={(e) => update({ sampleId: e.target.value })}
          placeholder="Typ of scan de Sample ID"
        />
      </label>
      <button type="button" className="btn btn-block" onClick={() => setScanning(true)}>
        SCAN QR-CODE
      </button>

      <h2 className="section-title">Notities</h2>
      <textarea
        className="field-input notes-area"
        value={collection.notes}
        onChange={(e) => update({ notes: e.target.value })}
        placeholder="Substraat, vindplaatskenmerken, geur, kleurverandering, opmerkingen..."
        rows={6}
      />

      <h2 className="section-title">Checklist</h2>
      <ul className="checklist">
        {collection.checklist.map((item) => (
          <li key={item.key}>
            <label className="check-item">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleChecklist(item.key)}
              />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>

      <h2 className="section-title">Foto&apos;s ({photos.length})</h2>
      <p className="muted small">
        Foto&apos;s worden lokaal bewaard en horen bij de lokale backup. Ze worden nooit
        automatisch geüpload.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden-file"
        onChange={onPhotoFiles}
      />
      <button
        type="button"
        className="btn btn-block"
        disabled={photoBusy}
        onClick={() => fileRef.current?.click()}
      >
        {photoBusy ? 'Bezig met toevoegen...' : 'FOTO TOEVOEGEN'}
      </button>

      <div className="thumb-grid">
        {photos.map((p) => (
          <PhotoThumb
            key={p.id}
            photo={p}
            onView={(url) => setLightbox(url)}
            onDelete={() => removePhoto(p.id)}
          />
        ))}
      </div>

      <button type="button" className="btn btn-danger btn-block" onClick={onDelete}>
        Collectie verwijderen
      </button>

      {scanning && (
        <QrScanner
          onResult={(value) => {
            update({ sampleId: value });
            setScanning(false);
          }}
          onClose={() => setScanning(false)}
        />
      )}

      {lightbox && (
        <div className="scanner-overlay" onClick={() => setLightbox(null)}>
          <img src={lightbox} className="lightbox-img" alt="Collectiefoto" />
        </div>
      )}
    </div>
  );
}

function PhotoThumb({
  photo,
  onView,
  onDelete,
}: {
  photo: Photo;
  onView: (url: string) => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(photo.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo.blob]);

  return (
    <div className="thumb">
      {url && (
        <button type="button" className="thumb-btn" onClick={() => onView(url)}>
          <img src={url} alt={photo.fileName} />
        </button>
      )}
      <button type="button" className="thumb-delete" onClick={onDelete} aria-label="Verwijderen">
        ×
      </button>
    </div>
  );
}
