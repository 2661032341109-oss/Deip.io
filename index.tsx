
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n'; // Initialize i18next

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Removed StrictMode to prevent double-initialization of Game Engine Refs/Physics Loops in Development
root.render(
    <App />
);
