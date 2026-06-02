import { useState } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { formatCurrency, formatDate } from '../../utils/helpers'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'

function StatCard({ label, value, cls, isCount }) {
  return (
    <div className={`erp-stat ${cls}`}>
      <div className="s-label">{label}</div>
      <div className="s-value">{isCount ? value : formatCurrency(value)}</div>
    </div>
  )
}

function DetalheModal({ cliente, onClose }) {
  const [ordens] = useLocalState('ts_ordens', [])
  const [contas] = useLocalState('ts_contasReceber', [])

  // Todas as contas vinculadas ao cliente via ordemId
  const ordensCliente = ordens.filter(o => o.clienteId === cliente.id)
  const contasCliente = contas.filter(c =>
    ordensCliente.some(o => o.id === c.ordemId)
  )

  // Contas sem ordemId mas com pedidoId vinculado ao cliente (parcelas de pedido)
  // já estão cobertas pelo ordemId, pois o ContasReceberModal sempre seta ordemId

  return (
    <Modal title={`Contas a Receber — ${cliente.nome}`} onClose={onClose} size="lg">
      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th style={{ width:'130px' }}>Nº OS</th>
            <th>Descrição</th>
            <th style={{ width:'90px' }}>Vencimento</th>
            <th style={{ width:'90px' }}>Status</th>
            <th className="right" style={{ width:'120px' }}>Valor</th>
          </tr></thead>
          <tbody>
            {contasCliente.length === 0 && (
              <tr className="empty"><td colSpan={5}>Nenhuma conta encontrada</td></tr>
            )}
            {contasCliente.map(conta => {
              const ordem = ordensCliente.find(o => o.id === conta.ordemId)
              return (
                <tr key={conta.id}>
                  <td className="mono">{ordem?.numero || '—'}</td>
                  <td>{conta.descricao}</td>
                  <td className="muted">{formatDate(conta.vencimento)}</td>
                  <td><Badge value={conta.status} /></td>
                  <td className={`right ${conta.status === 'aberto' ? 'debit' : 'credit'}`} style={{ fontWeight:600 }}>
                    {formatCurrency(conta.valor || 0)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

export default function ClientesFinanceiro() {
  const [search, setSearch]           = useState('')
  const [filtroSaldo, setFiltroSaldo] = useState(false)
  const [detalheCliente, setDetalheCliente] = useState(null)

  const [clientes] = useLocalState('ts_clientes',       [])
  const [ordens]   = useLocalState('ts_ordens',         [])
  const [contas]   = useLocalState('ts_contasReceber',  [])

  const dados = clientes.map(cli => {
    const ordensCliente = ordens.filter(o => o.clienteId === cli.id)
    // Todas as parcelas/contas vinculadas às ordens do cliente
    const contasCliente = contas.filter(c =>
      ordensCliente.some(o => o.id === c.ordemId)
    )

    const saldoAberto   = contasCliente.filter(c => c.status === 'aberto')
      .reduce((s, c) => s + (c.valor || 0), 0)
    const totalRecebido = contasCliente.filter(c => c.status === 'confirmado')
      .reduce((s, c) => s + (c.valor || 0), 0)
    const qtdAberto = contasCliente.filter(c => c.status === 'aberto').length
    const qtdTotal  = contasCliente.length

    return { ...cli, saldoAberto, totalRecebido, qtdAberto, qtdTotal }
  })

  const filtered = dados.filter(c => {
    const matchSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase())
    const matchSaldo  = !filtroSaldo || c.saldoAberto > 0
    return matchSearch && matchSaldo
  })

  const totalAberto   = filtered.reduce((s, c) => s + c.saldoAberto,   0)
  const totalRecebido = filtered.reduce((s, c) => s + c.totalRecebido, 0)
  const comSaldo      = filtered.filter(c => c.saldoAberto > 0).length

  return (
    <div className="erp-fill">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <h2 style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.04em' }}>
          Clientes — Saldo a Receber
        </h2>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px' }}>
        <StatCard label="Total em Aberto"    value={totalAberto}   cls="orange" />
        <StatCard label="Total Recebido"     value={totalRecebido} cls="green"  />
        <StatCard label="Clientes com Saldo" value={comSaldo}      cls="blue" isCount />
      </div>

      <div className="erp-filter-row">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente..." className="erp-input" style={{ width:'260px' }}
        />
        <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#54698D', cursor:'pointer' }}>
          <input type="checkbox" checked={filtroSaldo} onChange={e => setFiltroSaldo(e.target.checked)} />
          Apenas com saldo em aberto
        </label>
      </div>

      <div className="erp-panel erp-panel-fill">
        <table className="erp-table">
          <thead><tr>
            <th>Cliente</th>
            <th>Telefone</th>
            <th className="center" style={{ width:'80px' }}>OS Total</th>
            <th className="center" style={{ width:'80px' }}>Em Aberto</th>
            <th className="right" style={{ width:'130px' }}>Saldo a Receber</th>
            <th className="right" style={{ width:'130px' }}>Total Recebido</th>
            <th style={{ width:'80px' }}>Detalhe</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <tr className="empty"><td colSpan={7}>Nenhum cliente encontrado</td></tr>
            )}
            {[...filtered]
              .sort((a, b) => b.saldoAberto - a.saldoAberto)
              .map(cli => (
                <tr key={cli.id}>
                  <td style={{ fontWeight:500 }}>{cli.nome}</td>
                  <td className="muted">{cli.telefone || '—'}</td>
                  <td className="center muted">{cli.qtdTotal || '—'}</td>
                  <td className="center">
                    {cli.qtdAberto > 0
                      ? <span style={{ fontWeight:600, color:'#E65100' }}>{cli.qtdAberto}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="right" style={{ fontWeight:600, color: cli.saldoAberto > 0 ? '#E65100' : '#54698D' }}>
                    {cli.saldoAberto > 0 ? formatCurrency(cli.saldoAberto) : '—'}
                  </td>
                  <td className="right" style={{ fontWeight:600, color:'#2E7D32' }}>
                    {cli.totalRecebido > 0 ? formatCurrency(cli.totalRecebido) : '—'}
                  </td>
                  <td className="center">
                    {cli.qtdTotal > 0 && (
                      <button onClick={() => setDetalheCliente(cli)} className="erp-btn erp-btn-link erp-btn-sm">Ver</button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {detalheCliente && (
        <DetalheModal cliente={detalheCliente} onClose={() => setDetalheCliente(null)} />
      )}
    </div>
  )
}
