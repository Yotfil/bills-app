import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// Aplica el tema de color guardado (data-theme en <html>) antes de montar React, sin parpadeo.
import './store/themeStore';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* En la raíz (y no dentro de App) para cubrir también login/onboarding/splash. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
