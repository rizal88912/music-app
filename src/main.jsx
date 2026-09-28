import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom' // <--- UBAH DI SINI
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter> {/* <--- UBAH BUNGKUSAN INI JUGA */}
      <App />
    </HashRouter>
  </React.StrictMode>,
)