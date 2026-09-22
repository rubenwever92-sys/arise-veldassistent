import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SearchPage } from './pages/SearchPage';
import { SpeciesDetailPage } from './pages/SpeciesDetailPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { CollectionDetailPage } from './pages/CollectionDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ImportPage } from './pages/ImportPage';
import { BackupPage } from './pages/BackupPage';
import { ensureSeeded } from './services/seed';
import './App.css';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Onbekende fout bij laden.');
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div className="boot-screen">
        <p>ARISE Veldassistent wordt geladen...</p>
      </div>
    );
  }

  return (
    <>
      {error && <div className="warning-box">Databasefout: {error}</div>}
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/search" replace />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="species/:id" element={<SpeciesDetailPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="collections/:id" element={<CollectionDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="backup" element={<BackupPage />} />
          <Route path="*" element={<Navigate to="/search" replace />} />
        </Route>
      </Routes>
    </>
  );
}
