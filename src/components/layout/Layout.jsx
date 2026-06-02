import { useState } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children, currentPage, onNavigate, onLogout, user }) {
  const [open, setOpen] = useState(false)

  const navigate = (page) => { onNavigate(page); setOpen(false) }

  return (
    <div style={{ display:'flex', width:'100%', height:'100vh', overflow:'hidden' }}>

      {/* Barra superior — só aparece no mobile via CSS */}
      <header className="ts-topbar">
        <button className="ts-hamburger" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <span /><span /><span />
        </button>
        <span className="ts-topbar-brand">⚓ TOP SAIL</span>
        <div style={{ width:40 }} />
      </header>

      {/* Backdrop escuro ao abrir sidebar no mobile */}
      {open && <div className="ts-backdrop" onClick={() => setOpen(false)} />}

      {/* Sidebar (fixo no desktop, drawer no mobile) */}
      <div className={`ts-sidebar-wrap${open ? ' ts-sidebar-open' : ''}`}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={navigate}
          onLogout={onLogout}
          user={user}
          onCloseMobile={() => setOpen(false)}
        />
      </div>

      <main className="ts-main">
        {children}
      </main>
    </div>
  )
}
