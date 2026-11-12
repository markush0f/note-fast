import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./app/styles/styles.css";

if (import.meta.env.PROD && 'serviceWorker' in navigator && !('__TAURI_INTERNALS__' in window)) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(error => console.warn('No se pudo preparar el acceso sin conexión:', error));
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
