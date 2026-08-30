import React from 'react';
import ReactDOM from 'react-dom/client';

import { ErrorBoundary } from '../components/ErrorBoundary';
import App from './App';
import '../styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Popup root element is missing');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary area="the popup">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
