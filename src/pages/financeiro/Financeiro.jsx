import FluxoCaixaView from './FluxoCaixaView'

export default function Financeiro() {
  return (
    <div className="erp-page">
      <nav className="erp-bc">
        <span>TOP SAIL</span><span className="sep">/</span>
        <span className="cur">Financeiro</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">Financeiro</h1>
      </div>

      <FluxoCaixaView />
    </div>
  )
}
