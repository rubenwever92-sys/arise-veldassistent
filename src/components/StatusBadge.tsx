import type { AriseDisplayStatus } from '../types';

interface Props {
  status: AriseDisplayStatus;
}

/** Toont de ARISE-status altijd als tekst, ondersteund met kleur. */
export function StatusBadge({ status }: Props) {
  const cls = `status-badge status-${status.replace(/\s+/g, '-').toLowerCase()}`;
  return <span className={cls}>{status}</span>;
}
