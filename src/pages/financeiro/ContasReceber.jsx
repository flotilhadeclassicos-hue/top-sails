import { useState } from 'react'
import { useLocalState, readLocal, writeLocal } from '../../hooks/useLocalState'
import { uuid, formatDate, formatCurrency, today } from '../../utils/helpers'
import Modal, { ConfirmModal } from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'

function StatCard({ label, value, cls }) {
  return (
    <div className={`erp-stat ${cls}`}>
      <div className="s-label">{label}</div>
      <div className="s-value">{formatCurrency(value)}</div>
    </div>
  )
}

function BaixaModal({ conta, onClose, onDone }) {
  const [forma, setForma] = useState('pix')
  const [parteId, setParteId] = useState('')
  const partes = readLocal('ts_partes', [])

  const handleConfirm = () => {
    const dt = today()
    const novosLancIds = []

    if (forma === 'pix') {
      const fin = readLocal('ts_financeiro', [])
      const l = { id:uuid(), descricao:conta.descricao, categoriaId:conta.categoriaId, parteId:null, valor:conta.valor, tipo:'receita', data:dt, baixaCruzadaId:null, contaId:conta.id }
      writeLocal('ts_financeiro', [...fin, l]); novosLancIds.push(l.id)

    } else if (forma === 'dinheiro') {
      const cax = readLocal('ts_caixinha', [])
      const l = { id:uuid(), descricao:conta.descricao, categoriaId:conta.categoriaId, parteId:null, valor:conta.valor, tipo:'receita', data:dt, baixaCruzadaId:null, contaId:conta.id }
      writeLocal('ts_caixinha', [...cax, l]); novosLancIds.push(l.id)

    } else if (forma === 'cruzado') {
      // Partidas dobradas — recebimento em conta de terceiros
      const baixaCruzadaId = uuid()
      const ob    = readLocal('ts_offBook', [])
      const parte = partes.find(p => p.id === parteId)
      const allCats     = readLocal('ts_categorias', [])
      const catReceita  = conta.categoriaId
      const catParteRel = (allCats.find(c => c.nome === 'Parte Relacionada') || {}).id || catReceita

      // 1. Off Book Crédito — categoria da conta (receita); aparece na aba Off Book
      const cr = {
        id:uuid(), descricao: conta.descricao,
        categoriaId: catReceita, parteId: null,
        valor: conta.valor, tipo: 'receita',
        data: dt, baixaCruzadaId, contaId: conta.id,
      }
      // 2. Off Book Débito — categoria "Parte Relacionada"; aparece na aba Off Book
      const db = {
        id:uuid(), descricao: `Repasse — ${parte?.nome || 'Terceiro'}`,
        categoriaId: catParteRel, parteId: null,
        valor: conta.valor, tipo: 'despesa',
        data: dt, baixaCruzadaId, contaId: conta.id,
      }
      // 3. Gestão de Contas Crédito — categoria "Parte Relacionada"; aparece em Gestão de Contas
      const gc = {
        id:uuid(), descricao: conta.descricao,
        categoriaId: catParteRel, parteId,
        valor: conta.valor, tipo: 'receita',
        data: dt, baixaCruzadaId, contaId: conta.id,
      }
      writeLocal('ts_offBook', [...ob, cr, db, gc])
      novosLancIds.push(cr.id, db.id, gc.id)
    }

    const contas = readLocal('ts_contasReceber', [])
    writeLocal('ts_contasReceber', contas.map(c =>
      c.id === conta.id ? { ...c, status:'confirmado', formaPagamento:forma, lancIds:novosLancIds } : c
    ))
    onDone(); onClose()
  }

  return (
    <Modal title={`Baixa — ${conta.descricao}`} onClose={onClose} size="sm">
      <div style={{ padding:'10px 12px', background:'#F4F6F8', border:'1px solid #D8DDE6', borderRadius:'2px', marginBottom:'16px' }}>
        <div style={{ fontSize:'10px', color:'#54698D', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'3px' }}>Valor a Receber</div>
        <div style={{ fontSize:'20px', fontWeight:700, color:'#2E7D32' }}>{formatCurrency(conta.valor)}</div>
      </div>
      <div style={{ marginBottom:'12px' }}>
        <label className="erp-label">Forma de Recebimento</label>
        <select value={forma} onChange={e => { setForma(e.target.value); setParteId('') }} className="erp-select">
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
      <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
        <button onClick={onClose} className="erp-btn erp-btn-secondary">Cancelar</button>
        <button onClick={handleConfirm} disabled={forma==='cruzado' && !parteId} className="erp-btn erp-btn-success">
          Confirmar Recebimento
        </button>
      </div>
    </Modal>
  )
}

function ContaForm({ initial, onClose, onDone }) {
  const categorias = readLocal('ts_categorias', []).filter(c => c.tipo==='receita')
  const [form, setForm] = useState(() => initial
    ? { descricao:initial.descricao, categoriaId:initial.categoriaId, valor:initial.valor, vencimento:initial.vencimento }
    : { descricao:'', categoriaId:'', valor:'', vencimento:today() }
  )
  const handleSubmit = (e) => {
    e.preventDefault()
    const contas = readLocal('ts_contasReceber', [])
    const p = { ...form, valor:parseFloat(form.valor)||0 }
    if (initial) { writeLocal('ts_contasReceber', contas.map(c => c.id===initial.id ? { ...c, ...p } : c)) }
    else { writeLocal('ts_contasReceber', [...contas, { id:uuid(), status:'aberto', ordemId:null, lancIds:[], formaPagamento:null, baixaCruzadaId:null, ...p }]) }
    onDone(); onClose()
  }
  return (
    <Modal title={initial ? 'Editar Conta a Receber' : 'Nova Conta a Receber'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom:'12px' }}><label className="erp-label">Descrição *</label><input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao:e.target.value }))} required className="erp-input" /></div>
        <div style={{ marginBottom:'12px' }}><label className="erp-label">Categoria</label><select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId:e.target.value }))} className="erp-select"><option value="">Selecione...</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div><label className="erp-label">Valor (R$) *</label><input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor:e.target.value }))} required className="erp-input" /></div>
          <div><label className="erp-label">Vencimento *</label><input type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento:e.target.value }))} required className="erp-input" /></div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
          <button type="button" onClick={onClose} className="erp-btn erp-btn-secondary">Cancelar</button>
          <button type="submit" className="erp-btn erp-btn-primary">{initial ? 'Salvar' : 'Criar'}</button>
        </div>
      </form>
    </Modal>
  )
}

function CadeiaModal({ id, onClose }) {
  const entries = readLocal('ts_offBook', []).filter(i => i.baixaCruzadaId === id)
  const categorias = readLocal('ts_categorias', [])
  return (
    <Modal title="Cadeia de Pagamento Cruzado" onClose={onClose}>
      <table className="erp-table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th className="right">Valor</th></tr></thead>
        <tbody>{entries.map(e => { const cat=categorias.find(c=>c.id===e.categoriaId); return (<tr key={e.id}><td className="muted">{formatDate(e.data)}</td><td>{e.descricao}</td><td className="muted">{cat?.nome||'—'}</td><td><Badge value={e.tipo}/></td><td className={`right ${e.tipo==='receita'?'credit':'debit'}`}>{e.tipo==='receita'?'+':'−'}{formatCurrency(e.valor)}</td></tr>) })}</tbody>
      </table>
    </Modal>
  )
}

export default function ContasReceber() {
  const [contas, setContas] = useLocalState('ts_contasReceber', [])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [baixaItem, setBaixaItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [cadeiaId, setCadeiaId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [statusFilter, setStatusFilter] = useState('aberto')
  const categorias = readLocal('ts_categorias', [])

  const refresh = () => { setRefreshKey(k => k+1); setContas(readLocal('ts_contasReceber', [])) }

  const filtered = contas.filter(c => !statusFilter || c.status === statusFilter)
  const emAberto = contas.filter(c => c.status==='aberto').reduce((s,c) => s+(c.valor||0), 0)
  const recebido = contas.filter(c => c.status==='confirmado').reduce((s,c) => s+(c.valor||0), 0)

  const handleEstorno = (conta) => {
    if (conta.formaPagamento==='pix')      { const f=readLocal('ts_financeiro',[]); writeLocal('ts_financeiro', f.filter(l=>!conta.lancIds?.includes(l.id))) }
    else if (conta.formaPagamento==='dinheiro') { const c=readLocal('ts_caixinha',[]); writeLocal('ts_caixinha', c.filter(l=>!conta.lancIds?.includes(l.id))) }
    else if (conta.formaPagamento==='cruzado')  { const o=readLocal('ts_offBook',[]); writeLocal('ts_offBook', o.filter(l=>!conta.lancIds?.includes(l.id))) }
    setContas(prev => prev.map(c => c.id===conta.id ? { ...c, status:'aberto', formaPagamento:null, lancIds:[] } : c))
  }

  const STATUS_TABS = [{ value:'', label:'Todos' }, { value:'aberto', label:'Em aberto' }, { value:'confirmado', label:'Confirmados' }]

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <h2 style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.04em' }}>Contas a Receber</h2>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="erp-btn erp-btn-primary erp-btn-sm">+ Nova Conta</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
        <StatCard label="Saldo em Aberto" value={emAberto} cls="orange" />
        <StatCard label="Total Recebido"  value={recebido} cls="green"  />
      </div>

      <div className="erp-tabs" style={{ marginBottom:'12px' }}>
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => setStatusFilter(t.value)} className={`erp-tab ${statusFilter===t.value?'active':''}`}>{t.label}</button>
        ))}
      </div>

      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th>Descrição</th><th style={{ width:'130px' }}>Categoria</th>
            <th style={{ width:'90px' }}>Vencimento</th><th style={{ width:'80px' }}>Pagamento</th>
            <th className="right" style={{ width:'110px' }}>Valor</th>
            <th style={{ width:'90px' }}>Status</th><th style={{ width:'160px' }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length===0 && <tr className="empty"><td colSpan={7}>Nenhuma conta encontrada</td></tr>}
            {filtered.map(conta => {
              const cat = categorias.find(c => c.id===conta.categoriaId)
              const isCruzado = conta.lancIds?.length>0 && conta.formaPagamento==='cruzado'
              return (
                <tr key={conta.id}>
                  <td>{conta.descricao}</td>
                  <td className="muted">{cat?.nome||'—'}</td>
                  <td className="muted">{formatDate(conta.vencimento)}</td>
                  <td>{conta.formaPagamento ? <Badge value={conta.formaPagamento}/> : '—'}</td>
                  <td className="right credit">{formatCurrency(conta.valor)}</td>
                  <td><Badge value={conta.status}/></td>
                  <td>
                    <span style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                      {conta.status==='aberto' && <>
                        <button onClick={() => setBaixaItem(conta)} className="erp-btn erp-btn-success erp-btn-xs">Baixar</button>
                        <button onClick={() => { setEditItem(conta); setShowForm(true) }} className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                      </>}
                      {conta.status==='confirmado' && <button onClick={() => handleEstorno(conta)} className="erp-btn erp-btn-link erp-btn-sm" style={{ color:'#E65100' }}>↩ Estornar</button>}
                      {isCruzado && <button onClick={() => { const ob=readLocal('ts_offBook',[]); const f=ob.find(i=>conta.lancIds?.includes(i.id)&&i.baixaCruzadaId); if(f) setCadeiaId(f.baixaCruzadaId) }} className="erp-btn erp-btn-link-purple erp-btn-sm">Ver cadeia</button>}
                      <button onClick={() => setDeleteItem(conta)} className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && <ContaForm initial={editItem} onClose={() => setShowForm(false)} onDone={refresh} />}
      {baixaItem && <BaixaModal conta={baixaItem} onClose={() => setBaixaItem(null)} onDone={refresh} />}
      {deleteItem && <ConfirmModal title="Excluir Conta" message={`Excluir "${deleteItem.descricao}"?`} danger onConfirm={() => setContas(prev => prev.filter(c => c.id!==deleteItem.id))} onClose={() => setDeleteItem(null)} />}
      {cadeiaId && <CadeiaModal id={cadeiaId} onClose={() => setCadeiaId(null)} />}
    </div>
  )
}
