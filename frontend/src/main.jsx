import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

/**
 * RafApp Application Entry Point
 * * Hierarchy:
 * 1. StrictMode: Development-only check for side effects
 * 2. BrowserRouter: Contextual provider for industrial-grade routing
 * 3. App: Root shell & Infrastructure provider
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);