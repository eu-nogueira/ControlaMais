import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core'
import './index.css'
import App from './App.jsx'
import { aplicarTema, lerTemaLocal } from './services/tema'

aplicarTema(lerTemaLocal())

if (Capacitor.isNativePlatform()) {
  SystemBars.setStyle({ style: SystemBarsStyle.Dark, bar: SystemBarType.StatusBar })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
