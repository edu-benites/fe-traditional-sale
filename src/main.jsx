import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' 
import './assets/global.css' // Importando o CSS global que criamos!

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)