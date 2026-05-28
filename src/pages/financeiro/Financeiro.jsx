import { useState } from 'react'
import FluxoCaixaView from './FluxoCaixaView'
import ImportadorNorthSails from '../../components/ImportadorNorthSails'

export default function Financeiro() {
  const [showImport, setShowImport] = useState(false)

  return (
    <div style={{ padding:'20px 24px' }}>
      <nav className="erp-bc">
        <span>TOP SAIL</span><span className="sep">/</span>
        <span className="cur">Financeiro</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">Financeiro</h1>
        <button onClick={() => setShowImport(true)} className="erp-btn erp-btn-secondary" style={{ fontSize:'12px' }}>
          ↑ Importar Extrato North Sails
        </button>
      </div>

      <FluxoCaixaView />

      {showImport && (
        <ImportadorNorthSails
          onClose={() => setShowImport(false)}
          onDone={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
