import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getSetting } from '../db';
import { daysSince } from '../utils/date';

const STALE_DAYS = 60;

/** App-schil met navigatie (onderaan op mobiel, opzij op desktop). */
export function Layout() {
  const online = useOnlineStatus();
  const [staleDays, setStaleDays] = useState<number | null>(null);

  useEffect(() => {
    getSetting<string | null>('lastAriseImport', null).then((iso) => {
      const d = daysSince(iso);
      if (d !== null && d > STALE_DAYS) setStaleDays(d);
    });
  }, []);

  return (
    <div className="app-shell">
      <div className={`net-status ${online ? 'online' : 'offline'}`}>
        {online ? 'Online' : 'Offline'}
      </div>

      <main className="app-main">
        {staleDays !== null && (
          <div className="stale-banner">
            ARISE-gegevens zijn ouder dan {STALE_DAYS} dagen. Overweeg de
            targetlist bij te werken.
          </div>
        )}
        <Outlet />
      </main>

      <nav className="app-nav">
        <NavLink to="/search" className="nav-item">
          Zoeken
        </NavLink>
        <NavLink to="/collections" className="nav-item">
          Collecties
        </NavLink>
        <NavLink to="/settings" className="nav-item">
          Instellingen
        </NavLink>
      </nav>
    </div>
  );
}
