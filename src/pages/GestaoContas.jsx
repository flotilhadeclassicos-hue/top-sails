import { useState, Component } from 'react'
import { useLocalState, readLocal, writeLocal } from '../hooks/useLocalState'
import { uuid, formatDate, formatCurrency, today, currentMonthKey, monthLabel } from '../utils/helpers'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import Badge from '../components/ui/Badge'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e.message || String(e) } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:'20px', background:'#FDECEA', border:'1px solid #E8A09A', borderRadius:'2px', color:'#C62828', fontSize:'12px' }}>
          <strong>Erro ao carregar extrato:</strong> {this.state.error}
          <br /><button onClick={() => this.setState({ error: null })} style={{ marginTop:'8px', fontSize:'11px', cursor:'pointer' }}>Tentar novamente</button>
        </div>
      )
    }
    return this.props.children
  }
}

function StatCard({ label, value, cls }) {
  return (
    <div className={`erp-stat ${cls}`}>
      <div className="s-label">{label}</div>
      <div className="s-value">{formatCurrency(value)}</div>
    </div>
  )
}

function MonthSelector({ value, onChange }) {
  const prev = () => {
    const [y, m] = value.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }
  const next = () => {
    const [y, m] = value.split('-').map(Number)
    const d = new Date(y, m, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }
  return (
    <div style={{ display:'inline-flex', alignItems:'center', border:'1px solid #D8DDE6', borderRadius:'2px', background:'#fff', overflow:'hidden' }}>
      <button onClick={prev} style={{ padding:'4px 10px', background:'none', border:'none', borderRight:'1px solid #D8DDE6', cursor:'pointer', color:'#54698D', fontSize:'13px' }}>‹</button>
      <span style={{ padding:'4px 14px', fontSize:'12px', fontWeight:600, color:'#16191F', minWidth:'90px', textAlign:'center' }}>{monthLabel(value)}</span>
      <button onClick={next} style={{ padding:'4px 10px', background:'none', border:'none', borderLeft:'1px solid #D8DDE6', cursor:'pointer', color:'#54698D', fontSize:'13px' }}>›</button>
    </div>
  )
}

function ParteForm({ initial, onClose }) {
  const [form, setForm] = useState(initial
    ? { nome:initial.nome, tipo:initial.tipo, telefone:initial.telefone||'', observacao:initial.observacao||'' }
    : { nome:'', tipo:'Pessoa', telefone:'', observacao:'' }
  )
  const [saving, setSaving] = useState(false)
  const [erro,   setErro]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setErro('')
    const current = readLocal('ts_partes', [])
    const nova = initial
      ? current.map(p => p.id === initial.id ? { ...p, ...form } : p)
      : [...current, { id:uuid(), ...form }]
    try {
      await writeLocal('ts_partes', nova)
      onClose()
    } catch {
      setErro('Erro ao salvar. Verifique a conexão e tente novamente.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title={initial ? 'Editar Parte Relacionada' : 'Nova Parte Relacionada'} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom:'12px' }}>
          <label className="erp-label">Nome *</label>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome:e.target.value }))} required className="erp-input" placeholder="Nome da parte relacionada" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div>
            <label className="erp-label">Tipo</label>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo:e.target.value }))} className="erp-select">
              <option>Pessoa</option><option>Empresa</option><option>Sócio</option><option>Outro</option>
            </select>
          </div>
          <div>
            <label className="erp-label">Telefone</label>
            <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone:e.target.value }))} className="erp-input" placeholder="(00) 00000-0000" />
          </div>
        </div>
        <div style={{ marginBottom:'12px' }}>
          <label className="erp-label">Observação</label>
          <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao:e.target.value }))} rows={2} className="erp-textarea" />
        </div>
        {erro && <div style={{ padding:'8px 10px', marginBottom:'10px', background:'#FDECEA', border:'1px solid #E8A09A', borderRadius:'2px', fontSize:'11px', color:'#C62828' }}>{erro}</div>}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
          <button type="button" onClick={onClose} disabled={saving} className="erp-btn erp-btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="erp-btn erp-btn-primary">{saving ? 'Salvando...' : initial ? 'Salvar' : 'Cadastrar'}</button>
        </div>
      </form>
    </Modal>
  )
}

function LancamentoForm({ parteId, initial, onClose, onDone }) {
  const categorias = readLocal('ts_categorias', [])
  const [form, setForm] = useState(() => initial
    ? { tipo:initial.tipo, categoriaId:initial.categoriaId, descricao:initial.descricao, valor:initial.valor, data:initial.data }
    : { tipo:'receita', categoriaId:'', descricao:'', valor:'', data:today() }
  )
  const catsFiltradas = categorias.filter(c =>
    form.tipo==='receita' ? (c.tipo==='receita'||c.tipo==='ambos') : (c.tipo==='despesa'||c.tipo==='ambos')
  )
  const handleSubmit = async (e) => {
    e.preventDefault()
    const ob = readLocal('ts_offBook', [])
    const p = { ...form, valor:parseFloat(form.valor)||0, parteId, baixaCruzadaId:null, contaId:null }
    try {
      if (initial) { await writeLocal('ts_offBook', ob.map(i => i.id===initial.id ? { ...i, ...p } : i)) }
      else { await writeLocal('ts_offBook', [...ob, { id:uuid(), ...p }]) }
      onDone(); onClose()
    } catch {
      alert('Erro ao salvar. Verifique a conexão e tente novamente.')
    }
  }
  return (
    <Modal title={initial ? 'Editar Lançamento' : 'Novo Lançamento Manual'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom:'12px' }}>
          <label className="erp-label">Tipo *</label>
          <div style={{ display:'flex', gap:'20px', marginTop:'4px' }}>
            {[['receita','Crédito'],['despesa','Débito']].map(([v,l]) => (
              <label key={v} style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'13px' }}>
                <input type="radio" name="tipo" value={v} checked={form.tipo===v} onChange={() => setForm(f => ({ ...f, tipo:v, categoriaId:'' }))} /> {l}
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:'12px' }}>
          <label className="erp-label">Categoria</label>
          <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId:e.target.value }))} className="erp-select">
            <option value="">Selecione...</option>
            {catsFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:'12px' }}><label className="erp-label">Descrição *</label><input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao:e.target.value }))} required className="erp-input" /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div><label className="erp-label">Valor (R$) *</label><input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor:e.target.value }))} required className="erp-input" /></div>
          <div><label className="erp-label">Data *</label><input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data:e.target.value }))} required className="erp-input" /></div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
          <button type="button" onClick={onClose} className="erp-btn erp-btn-secondary">Cancelar</button>
          <button type="submit" className="erp-btn erp-btn-primary">{initial ? 'Salvar' : 'Lançar'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ExtratoModal({ parte, onClose }) {
  const [offBook]    = useLocalState('ts_offBook',    [])
  const [categorias] = useLocalState('ts_categorias', [])
  const [mes, setMes] = useState(currentMonthKey())
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)

  const refresh = () => { setShowForm(false); setEditItem(null) }

  const all = offBook.filter(i => i.parteId === parte.id)
  const entries = all.filter(i => i.data?.startsWith(mes))

  // Saldo inicial = tudo antes do mês
  const antes = all.filter(i => (i.data?.substring(0,7) || '') < mes)
  const saldoInicial = antes.filter(i => i.tipo==='receita').reduce((s,i) => s+(i.valor||0), 0)
                     - antes.filter(i => i.tipo==='despesa').reduce((s,i) => s+(i.valor||0), 0)

  const totalC   = entries.filter(i => i.tipo==='receita').reduce((s,i) => s+(i.valor||0), 0)
  const totalD   = entries.filter(i => i.tipo==='despesa').reduce((s,i) => s+(i.valor||0), 0)
  const movimento = totalC - totalD
  const saldoFinal = saldoInicial + movimento

  const handleDelete = async (item) => {
    const all = readLocal('ts_offBook', [])
    try {
      await writeLocal('ts_offBook', all.filter(i => i.id !== item.id))
      refresh()
    } catch {
      alert('Erro ao excluir. Verifique a conexão e tente novamente.')
    }
  }

  return (
    <Modal title={`Extrato — ${parte.nome}`} onClose={onClose} size="xl">
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
          <MonthSelector value={mes} onChange={setMes} />
          <button onClick={() => { setEditItem(null); setShowForm(true) }} className="erp-btn erp-btn-primary erp-btn-sm">+ Lançamento Manual</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'8px', marginBottom:'16px' }}>
          <StatCard label="Saldo Inicial"                   value={saldoInicial} cls={saldoInicial>=0?'blue':'orange'} />
          <StatCard label={`Créditos — ${monthLabel(mes)}`} value={totalC}       cls="green" />
          <StatCard label={`Débitos — ${monthLabel(mes)}`}  value={totalD}       cls="red"   />
          <StatCard label={`Movimento — ${monthLabel(mes)}`}value={movimento}    cls={movimento>=0?'green':'red'} />
          <StatCard label="Saldo Final"                     value={saldoFinal}   cls={saldoFinal>=0?'blue':'orange'} />
        </div>

        <div className="erp-panel">
          <table className="erp-table">
            <thead><tr>
              <th style={{ width:'90px' }}>Data</th><th>Descrição</th>
              <th style={{ width:'140px' }}>Categoria</th>
              <th style={{ width:'80px' }}>Tipo</th>
              <th className="right" style={{ width:'120px' }}>Valor</th>
              <th style={{ width:'90px' }}>Ações</th>
            </tr></thead>
            <tbody>
              {entries.length===0 && <tr className="empty"><td colSpan={6}>Nenhum lançamento neste mês</td></tr>}
              {entries.map(item => {
                const cat = categorias.find(c => c.id===item.categoriaId)
                return (
                  <tr key={item.id}>
                    <td className="muted">{formatDate(item.data)}</td>
                    <td>{item.descricao}</td>
                    <td className="muted">{cat?.nome||'—'}</td>
                    <td><Badge value={item.tipo}/></td>
                    <td className={`right ${item.tipo==='receita'?'credit':'debit'}`}>
                      {item.tipo==='receita'?'+':'−'}{formatCurrency(item.valor)}
                    </td>
                    <td className="right">
                      <span style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                        {!item.baixaCruzadaId && (
                          <button onClick={() => { setEditItem(item); setShowForm(true) }} className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                        )}
                        <button onClick={() => setDeleteItem(item)} className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <LancamentoForm parteId={parte.id} initial={editItem} onClose={() => setShowForm(false)} onDone={refresh} />}
      {deleteItem && <ConfirmModal title="Excluir lançamento" message={`Excluir "${deleteItem.descricao}"?`} danger onConfirm={() => handleDelete(deleteItem)} onClose={() => setDeleteItem(null)} />}
    </Modal>
  )
}

export default function GestaoContas() {
  const [partes]   = useLocalState('ts_partes',  [])
  const [offBook]  = useLocalState('ts_offBook', [])
  const [mes, setMes] = useState(currentMonthKey())
  const [showParteForm, setShowParteForm] = useState(false)
  const [editParte, setEditParte] = useState(null)
  const [deleteParte, setDeleteParte] = useState(null)
  const [extratoParte, setExtratoParte] = useState(null)

  const getStats = (parteId) => {
    const all = offBook.filter(i => i.parteId === parteId)

    // Entradas ANTES do mês selecionado → saldo inicial
    const antes = all.filter(i => (i.data?.substring(0,7) || '') < mes)
    const saldoInicial = antes.filter(i => i.tipo==='receita').reduce((s,i) => s+(i.valor||0), 0)
                       - antes.filter(i => i.tipo==='despesa').reduce((s,i) => s+(i.valor||0), 0)

    // Entradas DO mês → movimento
    const doMes   = all.filter(i => i.data?.startsWith(mes))
    const creditos = doMes.filter(i => i.tipo==='receita').reduce((s,i) => s+(i.valor||0), 0)
    const debitos  = doMes.filter(i => i.tipo==='despesa').reduce((s,i) => s+(i.valor||0), 0)
    const movimento = creditos - debitos

    return { saldoInicial, creditos, debitos, movimento, saldoFinal: saldoInicial + movimento }
  }

  return (
    <div style={{ padding:'20px 24px' }}>
      <nav className="erp-bc">
        <span>TOP SAIL</span><span className="sep">/</span><span className="cur">Gestão de Contas</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">Gestão de Contas</h1>
        <button onClick={() => { setEditParte(null); setShowParteForm(true) }} className="erp-btn erp-btn-primary erp-btn-sm">+ Nova Parte</button>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
        <span style={{ fontSize:'12px', color:'#54698D', fontWeight:600 }}>Período:</span>
        <MonthSelector value={mes} onChange={setMes} />
      </div>

      {partes.length===0 && (
        <div className="erp-panel" style={{ padding:'40px', textAlign:'center', color:'#8A99A8', fontSize:'13px' }}>
          Nenhuma parte relacionada cadastrada. Clique em "+ Nova Parte" para iniciar.
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
        {partes.map(parte => {
          const stats = getStats(parte.id)
          return (
            <div key={parte.id} className="erp-panel" style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'12px' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#16191F' }}>{parte.nome}</div>
                  <div style={{ fontSize:'11px', color:'#8A99A8', marginTop:'2px' }}>
                    {parte.tipo}{parte.observacao ? ` · ${parte.observacao}` : ''}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  <button onClick={() => setExtratoParte(parte)} className="erp-btn erp-btn-secondary erp-btn-sm">Ver Extrato</button>
                  <button onClick={() => { setEditParte(parte); setShowParteForm(true) }} className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                  <button onClick={() => setDeleteParte(parte)} className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'8px' }}>
                <StatCard label="Saldo Inicial"                   value={stats.saldoInicial} cls={stats.saldoInicial>=0?'blue':'orange'} />
                <StatCard label={`Créditos — ${monthLabel(mes)}`} value={stats.creditos}     cls="green" />
                <StatCard label={`Débitos — ${monthLabel(mes)}`}  value={stats.debitos}      cls="red"   />
                <StatCard label={`Movimento — ${monthLabel(mes)}`}value={stats.movimento}    cls={stats.movimento>=0?'green':'red'} />
                <StatCard label="Saldo Final"                     value={stats.saldoFinal}   cls={stats.saldoFinal>=0?'blue':'orange'} />
              </div>
            </div>
          )
        })}
      </div>

      {showParteForm && <ParteForm initial={editParte} onClose={() => setShowParteForm(false)} />}
      {deleteParte && (
        <ConfirmModal title="Excluir Parte" message={`Excluir a parte "${deleteParte.nome}"? Os lançamentos relacionados permanecerão.`} danger
          onConfirm={() => writeLocal('ts_partes', readLocal('ts_partes', []).filter(p => p.id !== deleteParte.id))}
          onClose={() => setDeleteParte(null)} />
      )}
      {extratoParte && (
        <ErrorBoundary key={extratoParte.id}>
          <ExtratoModal parte={extratoParte} onClose={() => setExtratoParte(null)} />
        </ErrorBoundary>
      )}
    </div>
  )
}
