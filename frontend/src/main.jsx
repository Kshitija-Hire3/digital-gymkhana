import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import './styles/global.css';
import App from './App.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { ToastProvider } from './components/Toast.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><BrowserRouter><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></BrowserRouter></React.StrictMode>,
);
