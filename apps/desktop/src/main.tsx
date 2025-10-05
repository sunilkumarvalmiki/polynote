import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.css';
import { initializeThemeSystem } from '../../../packages/shared/src/themes/index.js';

// Initialize theme system with built-in themes
initializeThemeSystem();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
