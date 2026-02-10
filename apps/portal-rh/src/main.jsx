import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import api from './services/api.js'


console.log('🔍 Verificando Variáveis de Ambiente:', { API_URL: import.meta.env.VITE_API_URL });
console.log('🔍 Estado do Objeto API:', typeof api, Object.keys(api || {}));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
