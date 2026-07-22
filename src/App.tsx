import { useState } from 'react';
import type { Word } from './core/types';
import { AppProvider } from './state';
import { Dashboard } from './ui/Dashboard';
import { Review } from './ui/Review';
import { Triage } from './ui/Triage';
import { WordList } from './ui/WordList';
import { WordSheet } from './ui/WordSheet';
import { Settings } from './ui/Settings';
import { TabBar } from './ui/TabBar';
import type { Tab } from './ui/TabBar';
import { IconGear } from './ui/icons';

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheetWord, setSheetWord] = useState<Word | null>(null);
  const [reviewKick, setReviewKick] = useState(0);
  const [flaggedKick, setFlaggedKick] = useState(0);

  return (
    <AppProvider>
      <div className="shell">
        <header className="topbar">
          <div className="brand">Oxford 3000<span className="tm">™</span></div>
          <button className="iconbtn" aria-label="Réglages" onClick={() => setSettingsOpen(true)}>
            <IconGear />
          </button>
        </header>

        <main>
          <div hidden={tab !== 'home'}>
            <Dashboard
              onStart={() => { setTab('review'); setReviewKick((k) => k + 1); }}
              onConfigure={() => setTab('review')}
              onGoDifficult={() => { setTab('words'); setFlaggedKick((k) => k + 1); }}
              onGoTriage={() => setTab('triage')}
            />
          </div>
          <div hidden={tab !== 'review'}>
            <Review kick={reviewKick} visible={tab === 'review'} />
          </div>
          <div hidden={tab !== 'triage'}>
            <Triage visible={tab === 'triage'} />
          </div>
          <div hidden={tab !== 'words'}>
            <WordList openWord={setSheetWord} flaggedKick={flaggedKick} />
          </div>
        </main>

        <TabBar tab={tab} onChange={setTab} />
        <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <WordSheet word={sheetWord} onClose={() => setSheetWord(null)} />
      </div>
    </AppProvider>
  );
}
