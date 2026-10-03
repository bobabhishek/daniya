import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { PassesProvider } from './context/PassesContext';
import { ToastProvider } from './context/ToastContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <PassesProvider>
          <App />
        </PassesProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);
