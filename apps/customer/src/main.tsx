import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@shared/index.css';
import '@shared/i18n';
import App from './App';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { checkFirebaseConnection } from '@shared/lib/checkFirebaseConnection';
import { isAndroidClient } from '@shared/utils/platformVisuals';

const rootEl = document.documentElement;
if (isAndroidClient()) rootEl.classList.add('platform-android');
rootEl.classList.add('reduce-visual-effects');

checkFirebaseConnection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
