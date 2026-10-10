import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Shell } from './Shell';
import '@fontsource/bebas-neue/400.css';
import '@fontsource-variable/outfit/index.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
