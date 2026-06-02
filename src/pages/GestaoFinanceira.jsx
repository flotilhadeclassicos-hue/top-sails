import { useState } from 'react'
import ContasReceber from './financeiro/ContasReceber'
import ContasPagar from './financeiro/ContasPagar'
import ClientesFinanceiro from './financeiro/ClientesFinanceiro'
import ImportadorNorthSails from '../components/ImportadorNorthSails'

const TABS = [
  { id:'receber', label:'Contas a Receber' },
  { id:'pagar',   label:'Contas a Pagar'   },
  { id:'clientes',label:'Clientes'          },
]

export default function GestaoFinanceira() {
  const [tab, setTab] = useState('receber')
  const [showImport, setShowImport] = useState(false)

  const content = {
    receber:  <ContasReceber     key="receber"  />,
    pagar:    <ContasPagar       key="pagar"    />,
    clientes: <ClientesFinanceiro key="clientes" />,
  }

  return (
    <div className="erp-page">
      <nav className="erp-bc">
        <span>TOP SAIL</span><span className="sep">/</span>
        <span className="cur">Gestão Financeira</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">Gestão Financeira</h1>
        <button onClick={() => setShowImport(true)} className="erp-btn erp-btn-secondary" style={{ fontSize:'12px' }}>
          ↑ Importar Extrato North Sails
        </button>
      </div>

      <div className="erp-tabs">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`erp-tab ${tab===t.id?'active':''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {content[tab]}

      {showImport && (
        <ImportadorNorthSails
          onClose={() => setShowImport(false)}
          onDone={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
