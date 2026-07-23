import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

// Le navigateur ne re-télécharge sw.js qu'à la navigation : un onglet resté
// ouvert ne voit jamais un redeploy sans ce check périodique. À l'activation
// du nouveau SW, le mode 'autoUpdate' recharge la page tout seul.
const SW_CHECK_INTERVAL_MS = 60_000;

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    setInterval(async () => {
      if (registration.installing || !navigator.onLine) return;
      const resp = await fetch(swUrl, { cache: 'no-store' }).catch(() => null);
      if (resp?.status === 200) await registration.update();
    }, SW_CHECK_INTERVAL_MS);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
