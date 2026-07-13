import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@shared/index.css';
import './styles/merchant-location-picker.css';
import App from './App';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { checkFirebaseConnection } from '@shared/lib/checkFirebaseConnection';

checkFirebaseConnection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
