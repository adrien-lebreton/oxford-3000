import type { ReactNode } from 'react';
import { IconBook, IconCards, IconHome, IconTriage } from './icons';

export type Tab = 'home' | 'review' | 'triage' | 'words';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Accueil', icon: <IconHome /> },
  { id: 'review', label: 'Réviser', icon: <IconCards /> },
  { id: 'triage', label: 'Trier', icon: <IconTriage /> },
  { id: 'words', label: 'Mots', icon: <IconBook /> },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab ${tab === t.id ? 'active' : ''}`}
          aria-current={tab === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </nav>
  );
}
