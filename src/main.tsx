import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// Aplica el tema de color guardado (data-theme en <html>) antes de montar React, sin parpadeo.
import './store/themeStore';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
