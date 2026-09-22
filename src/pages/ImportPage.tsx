import { Link, useLocation } from 'react-router-dom';
import type { AriseImportResult } from '../services/import/applyAriseImport';
import { formatDate } from '../utils/date';

/** IMPORTCONTROLE: toont het resultaat van de laatste ARISE-import. */
export function ImportPage() {
  const location = useLocation();
  const result = location.state as AriseImportResult | null;

  if (!result) {
    return (
      <div className="page">
        <h1 className="app-title">Importcontrole</h1>
        <p className="muted">
          Er is nog geen importresultaat om te tonen. Werk eerst de ARISE
          Targetlist bij via Instellingen.
        </p>
        <Link to="/settings" className="btn">
          Naar Instellingen
        </Link>
      </div>
    );
  }

  const { report } = result;

  return (
    <div className="page import-page">
      <h1 className="app-title">Importcontrole</h1>

      <p className="import-line">
        {result.fileName} · {result.fungiCount} fungi · {formatDate(result.importedAt)}
      </p>

      <div className="counters">
        <div className="counter">
          <span className="counter-value">{report.exactMatches}</span>
          <span className="counter-label">Exact gekoppeld</span>
        </div>
        <div className="counter">
          <span className="counter-value">{report.newAriseSpecies}</span>
          <span className="counter-label">Nieuwe ARISE-soorten</span>
        </div>
        <div className="counter">
          <span className="counter-value">{report.nmvWithoutArise.length}</span>
          <span className="counter-label">NMV zonder ARISE</span>
        </div>
      </div>

      <ReportList
        title="Dubbele wetenschappelijke namen"
        items={report.duplicateNames}
        emptyText="Geen dubbele namen aangetroffen."
      />
      <ReportList
        title="Records met ontbrekende gegevens"
        items={report.missingData}
        emptyText="Geen records met ontbrekende gegevens."
      />
      <ReportList
        title="NMV-soorten zonder ARISE-match"
        items={report.nmvWithoutArise}
        emptyText="Alle NMV-soorten zijn gekoppeld."
      />

      <Link to="/search" className="btn btn-primary btn-block">
        Naar zoeken
      </Link>
    </div>
  );
}

function ReportList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <section className="settings-section">
      <h2>
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <ul className="report-list">
          {items.slice(0, 200).map((name) => (
            <li key={name}>{name}</li>
          ))}
          {items.length > 200 && (
            <li className="muted">... en {items.length - 200} meer</li>
          )}
        </ul>
      )}
    </section>
  );
}
