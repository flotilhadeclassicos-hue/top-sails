import { useState } from 'react'
import { useLocalState, readLocal, writeLocal } from '../hooks/useLocalState'
import { uuid, formatDate, formatCurrency, addDays, today, generateOSNumber } from '../utils/helpers'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import Badge from '../components/ui/Badge'

const STATUS_LIST = [
  { value:'aguardando', label:'Aguardando'  },
  { value:'emExecucao', label:'Em execução' },
  { value:'pronto',     label:'Pronto'      },
  { value:'entregue',   label:'Entregue'    },
]

const STATUS_COLORS = {
  aguardando: { bg:'#FEF3CD', border:'#E0A000', color:'#5F4000' },
  emExecucao: { bg:'#EAF3FB', border:'#A8C8E8', color:'#0050A0' },
  pronto:     { bg:'#EFFFEF', border:'#88C088', color:'#1A5C1A' },
  entregue:   { bg:'#F4F6F8', border:'#ADADAD', color:'#444444' },
}

function StatusSelect({ value, onChange }) {
  const c = STATUS_COLORS[value] || { bg:'#F4F6F8', border:'#ADADAD', color:'#444' }
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: c.bg, border: `1px solid ${c.border}`, color: c.color,
        borderRadius:'2px', padding:'2px 4px', fontSize:'11px', fontWeight:600,
        fontFamily:'inherit', cursor:'pointer', width:'100%',
      }}
    >
      {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  )
}

function FField({ label, children, col }) {
  return (
    <div style={{ gridColumn: col, marginBottom:'12px' }}>
      <label className="erp-label">{label}</label>
      {children}
    </div>
  )
}

function ErroBanco({ msg }) {
  if (!msg) return null
  return (
    <div style={{ margin:'10px 0', padding:'8px 10px', background:'#FDECEA', border:'1px solid #E8A09A', borderRadius:'2px', fontSize:'11px', color:'#C62828' }}>
      {msg}
    </div>
  )
}

function BaixaModal({ conta, onClose, onDone }) {
  const [forma, setForma]   = useState('pix')
  const [parteId, setParteId] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState('')
  const partes = readLocal('ts_partes', [])

  const handleConfirm = async () => {
    setErro('')
    setSaving(true)
    const dt = today()
    const novosLancIds = []

    try {
      if (forma === 'pix') {
        const fin = readLocal('ts_financeiro', [])
        const lanc = { id:uuid(), descricao:conta.descricao, categoriaId:conta.categoriaId, parteId:null, valor:conta.valor, tipo:'receita', data:dt, baixaCruzadaId:null, contaId:conta.id }
        await writeLocal('ts_financeiro', [...fin, lanc])
        novosLancIds.push(lanc.id)
      } else if (forma === 'dinheiro') {
        const cax = readLocal('ts_caixinha', [])
        const lanc = { id:uuid(), descricao:conta.descricao, categoriaId:conta.categoriaId, parteId:null, valor:conta.valor, tipo:'receita', data:dt, baixaCruzadaId:null, contaId:conta.id }
        await writeLocal('ts_caixinha', [...cax, lanc])
        novosLancIds.push(lanc.id)
      } else if (forma === 'cruzado') {
        const baixaCruzadaId = uuid()
        const ob          = readLocal('ts_offBook', [])
        const parte       = partes.find(p => p.id === parteId)
        const allCats     = readLocal('ts_categorias', [])
        const catReceita  = conta.categoriaId
        const catParteRel = (allCats.find(c => c.nome === 'Parte Relacionada') || {}).id

        if (!catParteRel) {
          setErro('Categoria "Parte Relacionada" não encontrada. Cadastre-a em Categorias.')
          setSaving(false)
          return
        }

        // 1. Off Book Crédito — categoria da ordem
        const cr = { id:uuid(), descricao:conta.descricao, categoriaId:catReceita, parteId:null, valor:conta.valor, tipo:'receita', data:dt, baixaCruzadaId, contaId:conta.id }
        // 2. Off Book Débito — categoria "Parte Relacionada"
        const db = { id:uuid(), descricao:`Repasse — ${parte?.nome||'Terceiro'}`, categoriaId:catParteRel, parteId:null, valor:conta.valor, tipo:'despesa', data:dt, baixaCruzadaId, contaId:conta.id }
        // 3. Gestão de Contas Crédito — conta da parte relacionada
        const gc = { id:uuid(), descricao:conta.descricao, categoriaId:catParteRel, parteId, valor:conta.valor, tipo:'receita', data:dt, baixaCruzadaId, contaId:conta.id }

        await writeLocal('ts_offBook', [...ob, cr, db, gc])
        novosLancIds.push(cr.id, db.id, gc.id)
      }

      const contas = readLocal('ts_contasReceber', [])
      await writeLocal('ts_contasReceber', contas.map(c =>
        c.id === conta.id ? { ...c, status:'confirmado', formaPagamento:forma, lancIds:novosLancIds } : c
      ))
      onDone(); onClose()
    } catch (e) {
      setErro('Erro ao salvar no banco de dados. Verifique a conexão e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Confirmação de Recebimento — ${conta.descricao}`} onClose={onClose} size="sm">
      <div style={{ marginBottom:'16px', padding:'10px 12px', background:'#F4F6F8', border:'1px solid #D8DDE6', borderRadius:'2px' }}>
        <span style={{ fontSize:'11px', color:'#54698D', display:'block', marginBottom:'3px', textTransform:'uppercase', letterSpacing:'0.04em', fontWeight:600 }}>Valor a Receber</span>
        <span style={{ fontSize:'20px', fontWeight:700, color:'#2E7D32' }}>{formatCurrency(conta.valor)}</span>
      </div>
      <div style={{ marginBottom:'12px' }}>
        <label className="erp-label">Forma de Recebimento</label>
        <select value={forma} onChange={e => { setForma(e.target.value); setParteId(''); setErro('') }} className="erp-select">
          <option value="pix">PIX → Bancos</option>
          <option value="dinheiro">Dinheiro → Caixinha</option>
          <option value="cruzado">Pagamento Cruzado → Off Book</option>
        </select>
      </div>
      {forma === 'cruzado' && (
        <>
          <div style={{ marginBottom:'10px', padding:'8px 10px', background:'#EAF3FB', border:'1px solid #A8C8E8', borderRadius:'2px', fontSize:'11px', color:'#0050A0', lineHeight:'1.5' }}>
            <strong>Partida dupla:</strong> Crédito Off Book → Débito Off Book (offset) → Crédito Gestão de Contas
          </div>
          <div style={{ marginBottom:'12px' }}>
            <label className="erp-label">Parte Relacionada *</label>
            <select value={parteId} onChange={e => setParteId(e.target.value)} className="erp-select" required>
              <option value="">Selecione a parte relacionada...</option>
              {partes.map(p => <option key={p.id} value={p.id}>{p.nome}{p.tipo ? ` — ${p.tipo}` : ''}</option>)}
            </select>
          </div>
        </>
      )}
      <ErroBanco msg={erro} />
      <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
        <button onClick={onClose} disabled={saving} className="erp-btn erp-btn-secondary">Cancelar</button>
        <button onClick={handleConfirm} disabled={saving || (forma === 'cruzado' && !parteId)} className="erp-btn erp-btn-success">
          {saving ? 'Salvando...' : 'Confirmar Recebimento'}
        </button>
      </div>
    </Modal>
  )
}

export function OrdemForm({ initial, ordens, onSave, onClose }) {
  const [form, setForm] = useState(initial || { clienteId:'', embarcacao:'', categoriaId:'', descricao:'', dataRetirada:today(), prazoDias:'', valor:'', status:'aguardando', pedidoId:'' })

  const clientes   = readLocal('ts_clientes', [])
  const categorias = readLocal('ts_categorias', []).filter(c => c.tipo === 'receita')
  const pedidosAprovados = readLocal('ts_pedidos', []).filter(p => p.status === 'pedAprovado')

  const dataEntrega = form.dataRetirada && form.prazoDias ? addDays(form.dataRetirada, form.prazoDias) : null

  const handleSubmit = (e) => {
    e.preventDefault()
    const numero = initial?.numero || generateOSNumber(ordens)
    const saved = { ...form, id:initial?.id||uuid(), numero, valor:parseFloat(form.valor)||0, prazoDias:parseInt(form.prazoDias)||0, dataEntrega }
    if (!initial?.id && saved.valor > 0) {
      const contas = readLocal('ts_contasReceber', [])
      const cat = categorias.find(c => c.id === saved.categoriaId)
      const cli = clientes.find(c => c.id === saved.clienteId)
      const contaId = uuid()
      writeLocal('ts_contasReceber', [...contas, {
        id:contaId, descricao:`${numero} — ${cat?.nome||'Serviço'}${cli?' / '+cli.nome:''}`,
        categoriaId:saved.categoriaId, valor:saved.valor, vencimento:dataEntrega||today(),
        status:'aberto', ordemId:saved.id, lancIds:[], formaPagamento:null, baixaCruzadaId:null,
      }])
      saved.contaReceberId = contaId
    }
    onSave(saved); onClose()
  }

  return (
    <Modal title={initial ? `Editar ${initial.numero}` : 'Nova Ordem de Serviço'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <FField label="Cliente *" col="1 / -1">
          <select value={form.clienteId} onChange={e => setForm(f => ({ ...f, clienteId:e.target.value }))} required className="erp-select">
            <option value="">Selecione o cliente...</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </FField>
        <FField label="Embarcação">
          <input value={form.embarcacao} onChange={e => setForm(f => ({ ...f, embarcacao:e.target.value }))} className="erp-input" placeholder="Nome / modelo" />
        </FField>
        <FField label="Categoria *">
          <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId:e.target.value }))} required className="erp-select">
            <option value="">Selecione...</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </FField>
        <FField label="Descrição" col="1 / -1">
          <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao:e.target.value }))} rows={2} className="erp-textarea" />
        </FField>
        <FField label="Data de Retirada *">
          <input type="date" value={form.dataRetirada} onChange={e => setForm(f => ({ ...f, dataRetirada:e.target.value }))} required className="erp-input" />
        </FField>
        <FField label="Prazo (dias)">
          <input type="number" min="0" value={form.prazoDias} onChange={e => setForm(f => ({ ...f, prazoDias:e.target.value }))} className="erp-input" />
        </FField>
        {dataEntrega && (
          <div style={{ gridColumn:'1 / -1', background:'#EAF3FB', border:'1px solid #A8C8E8', borderRadius:'2px', padding:'7px 12px', fontSize:'12px', color:'#0050A0', marginBottom:'12px' }}>
            📅 Entrega prevista: <strong>{formatDate(dataEntrega)}</strong>
          </div>
        )}
        <FField label="Valor (R$)">
          <input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor:e.target.value }))} className="erp-input" />
        </FField>
        <FField label="Pedido Vinculado (opcional)" col="1 / -1">
          <select value={form.pedidoId||''} onChange={e => setForm(f => ({ ...f, pedidoId:e.target.value }))} className="erp-select">
            <option value="">Nenhum pedido vinculado</option>
            {pedidosAprovados.map(p => {
              const cli = readLocal('ts_clientes',[]).find(c=>c.id===p.clienteId)
              return <option key={p.id} value={p.id}>{p.numero} — {cli?.nome||'—'}{p.embarcacao?' / '+p.embarcacao:''}</option>
            })}
          </select>
          {pedidosAprovados.length === 0 && (
            <span style={{ fontSize:'11px', color:'#8A99A8', marginTop:'3px', display:'block' }}>
              Nenhum pedido com status "Aprovado" disponível.
            </span>
          )}
        </FField>
        <FField label="Status">
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status:e.target.value }))} className="erp-select">
            {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FField>
        <div style={{ gridColumn:'1 / -1', display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'6px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
          <button type="button" onClick={onClose} className="erp-btn erp-btn-secondary">Cancelar</button>
          <button type="submit" className="erp-btn erp-btn-primary">{initial ? 'Salvar Alterações' : 'Criar OS'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Ordens() {
  const [ordens, setOrdens] = useLocalState('ts_ordens', [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [baixaItem, setBaixaItem] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const clientes   = readLocal('ts_clientes', [])
  const categorias = readLocal('ts_categorias', [])
  const pedidos    = readLocal('ts_pedidos', [])

  const filtered = ordens.filter(o => {
    const cli = clientes.find(c => c.id === o.clienteId)
    const matchS = !search || o.numero?.toLowerCase().includes(search.toLowerCase()) || cli?.nome?.toLowerCase().includes(search.toLowerCase()) || o.embarcacao?.toLowerCase().includes(search.toLowerCase())
    const matchT = !statusFilter || o.status === statusFilter
    return matchS && matchT
  })

  const handleSave = (item) => setOrdens(prev => prev.find(o => o.id === item.id) ? prev.map(o => o.id === item.id ? item : o) : [...prev, item])

  const handleStatusChange = (id, newStatus) => {
    setOrdens(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
  }

  const handleDelete = (item) => {
    setOrdens(prev => prev.filter(o => o.id !== item.id))
    if (item.contaReceberId) {
      const c = readLocal('ts_contasReceber', [])
      writeLocal('ts_contasReceber', c.filter(x => x.id !== item.contaReceberId))
    }
  }

  const contaDeOrdem = (ordem) => {
    const contas = readLocal('ts_contasReceber', [])
    return contas.find(c => c.ordemId === ordem.id)
  }

  return (
    <div style={{ padding:'20px 24px' }}>
      <nav className="erp-bc">
        <span>Top Sails</span><span className="sep">/</span><span className="cur">Ordens de Serviço</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">Ordens de Serviço</h1>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="erp-btn erp-btn-primary erp-btn-sm">+ Nova OS</button>
      </div>

      <div className="erp-filter-row">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por OS, cliente ou embarcação..." className="erp-input" style={{ width:'300px' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="erp-select" style={{ width:'160px' }}>
          <option value="">Todos os status</option>
          {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="erp-panel">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Nº OS</th><th>Cliente</th><th>Embarcação</th><th>Categoria</th>
              <th>Retirada</th><th>Entrega</th><th className="right">Valor</th>
              <th>Pedido</th><th>Status</th><th style={{ width:'140px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr className="empty"><td colSpan={10}>Nenhuma OS encontrada</td></tr>}
            {filtered.map(ordem => {
              const cli = clientes.find(c => c.id === ordem.clienteId)
              const cat = categorias.find(c => c.id === ordem.categoriaId)
              const conta = contaDeOrdem(ordem)
              const jaRecebido = conta?.status === 'confirmado'
              const pedidoVinculado = pedidos.find(p => p.id === ordem.pedidoId)
              return (
                <tr key={ordem.id}>
                  <td className="mono">{ordem.numero}</td>
                  <td style={{ fontWeight:500 }}>{cli?.nome||'—'}</td>
                  <td className="muted">{ordem.embarcacao||'—'}</td>
                  <td className="muted">{cat?.nome||'—'}</td>
                  <td className="muted">{formatDate(ordem.dataRetirada)}</td>
                  <td className="muted">{formatDate(ordem.dataEntrega)}</td>
                  <td className="right" style={{ fontWeight:600 }}>{formatCurrency(ordem.valor)}</td>
                  <td>
                    {pedidoVinculado
                      ? <span style={{ fontFamily:'monospace', fontSize:'11px', color:'#0070D2', fontWeight:600 }}>{pedidoVinculado.numero}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td style={{ padding:'4px 6px' }}>
                    <StatusSelect value={ordem.status} onChange={v => handleStatusChange(ordem.id, v)} />
                  </td>
                  <td>
                    <span style={{ display:'flex', gap:'8px', alignItems:'center', justifyContent:'flex-end', flexWrap:'wrap' }}>
                      {!jaRecebido && ordem.valor > 0 && conta && (
                        <button onClick={() => setBaixaItem(conta)} className="erp-btn erp-btn-success erp-btn-xs">Baixar</button>
                      )}
                      {jaRecebido && <span style={{ fontSize:'11px', color:'#2E7D32', fontWeight:600 }}>✓ Recebido</span>}
                      <button onClick={() => { setEditItem(ordem); setShowForm(true) }} className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                      <button onClick={() => setDeleteItem(ordem)} className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && <OrdemForm initial={editItem} ordens={ordens} onSave={handleSave} onClose={() => setShowForm(false)} />}
      {deleteItem && (
        <ConfirmModal title="Excluir Ordem de Serviço" message={`Confirma a exclusão da OS ${deleteItem.numero}? A conta a receber associada também será removida.`} danger
          onConfirm={() => handleDelete(deleteItem)} onClose={() => setDeleteItem(null)} />
      )}
      {baixaItem && <BaixaModal conta={baixaItem} onClose={() => setBaixaItem(null)} onDone={() => setRefreshKey(k => k+1)} />}
    </div>
  )
}
