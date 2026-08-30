import React from 'react';
import ReactDOM from 'react-dom/client';

import { ErrorBoundary } from '../components/ErrorBoundary';
import App from './App';
import '../styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Editor root element is missing');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary area="the editor">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
