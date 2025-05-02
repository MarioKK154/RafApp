// frontend/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
// Import BrowserRouter
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css' // Ensure Tailwind CSS/global styles are imported

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Wrap the App component with BrowserRouter */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)