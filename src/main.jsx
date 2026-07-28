/**
 * @file main.jsx
 * @description Entry point for the MeetingMind-AI React frontend application.
 * Initializes the React root and wraps the App component within BrowserRouter.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Create root React container and render application in Strict Mode with Router context
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
