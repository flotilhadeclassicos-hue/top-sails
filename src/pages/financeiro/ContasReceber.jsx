import { useState } from 'react'
import { useLocalState, readLocal, writeLocal } from '../../hooks/useLocalState'
import { uuid, formatDate, formatCurrency, today, monthLabel } from '../../utils/helpers'
import Modal, { ConfirmModal } from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { IconEdit, IconTrash, IconDownload, IconUndo, IconLink } from '../../components/ui/icons'
import ClienteModal, { LinkBtn } from '../../components/ui/ClienteModal'
import { PreviewModal } from '../Pedidos'

function StatCard({ label, value, cls }) {
  return (
    <div className={`erp-stat ${cls}`}>
      <div className="s-label">{label}</div>
      <div className="s-value">{formatCurrency(value)}</div>
    </div>
  )
}

function BaixaModal({ conta, onClose, onDone }) {
  const [forma, setForma]   = useState('pix')
  const [parteId, setParteId] = useState('')
  const [data, setData]     = useState(today())
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState('')
  const partes = readLocal('ts_partes', [])

  const handleConfirm = async () => {
    setErro('')
    setSaving(true)
    const dt = data || today()
    const novosLancIds = []

    try {
      if (forma === 'pix') {
        const fin = readLocal('ts_financeiro', [])
        const l = { id:uuid(), descricao:conta.descricao, categoriaId:conta.categoriaId, parteId:null, valor:conta.valor, tipo:'receita', data:dt, baixaCruzadaId:null, contaId:conta.id }
        await writeLocal('ts_financeiro', [...fin, l]); novosLancIds.push(l.id)

      } else if (forma === 'dinheiro') {
        const cax = readLocal('ts_caixinha', [])
        const l = { id:uuid(), descricao:conta.descricao, categoriaId:conta.categoriaId, parteId:null, valor:conta.valor, tipo:'receita', data:dt, baixaCruzadaId:null, contaId:conta.id }
        await writeLocal('ts_caixinha', [...cax, l]); novosLancIds.push(l.id)

      } else if (forma === 'cruzado') {
        const baixaCruzadaId = uuid()
        const ob    = readLocal('ts_offBook', [])
        const parte = partes.find(p => p.id === parteId)
        const allCats     = readLocal('ts_categorias', [])
        const catReceita  = conta.categoriaId
        const catParteRel = (allCats.find(c => c.nome === 'Parte Relacionada') || {}).id

        if (!catParteRel) {
          setErro('Categoria "Parte Relacionada" não encontrada. Cadastre-a em Categorias.')
          setSaving(false)
          return
        }

        // 1. Off Book Crédito — categoria da ordem
        const cr = {
          id:uuid(), descricao: conta.descricao,
          categoriaId: catReceita, parteId: null,
          valor: conta.valor, tipo: 'receita',
          data: dt, baixaCruzadaId, contaId: conta.id,
        }
        // 2. Off Book Débito — categoria "Parte Relacionada"
        const db = {
          id:uuid(), descricao: `Repasse — ${parte?.nome || 'Terceiro'}`,
          categoriaId: catParteRel, parteId: null,
          valor: conta.valor, tipo: 'despesa',
          data: dt, baixaCruzadaId, contaId: conta.id,
        }
        // 3. Gestão de Contas Crédito — conta da parte relacionada
        const gc = {
          id:uuid(), descricao: conta.descricao,
          categoriaId: catParteRel, parteId,
          valor: conta.valor, tipo: 'receita',
          data: dt, baixaCruzadaId, contaId: conta.id,
        }
        await writeLocal('ts_offBook', [...ob, cr, db, gc])
        novosLancIds.push(cr.id, db.id, gc.id)
      }

      const contas = readLocal('ts_contasReceber', [])
      await writeLocal('ts_contasReceber', contas.map(c =>
        c.id === conta.id ? { ...c, status:'confirmado', formaPagamento:forma, lancIds:novosLancIds } : c
      ))
      onDone(); onClose()
    } catch (e) {
      setErro(`Erro ao salvar (nada foi confirmado): ${e?.message || 'verifique a conexão e tente novamente.'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Baixa — ${conta.descricao}`} onClose={onClose} size="sm">
      <div style={{ padding:'10px 12px', background:'#F4F6F8', border:'1px solid #D8DDE6', borderRadius:'2px', marginBottom:'16px' }}>
        <div style={{ fontSize:'10px', color:'#54698D', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'3px' }}>Valor a Receber</div>
        <div style={{ fontSize:'20px', fontWeight:700, color:'#2E7D32' }}>{formatCurrency(conta.valor)}</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
        <div>
          <label className="erp-label">Forma de Recebimento</label>
          <select value={forma} onChange={e => { setForma(e.target.value); setParteId('') }} className="erp-select">
            <option value="pix">PIX → Bancos</option>
            <option value="dinheiro">Dinheiro → Caixinha</option>
            <option value="cruzado">Pagamento Cruzado → Off Book</option>
          </select>
        </div>
        <div>
          <label className="erp-label">Data do Recebimento</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)} className="erp-input" />
        </div>
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
      {erro && (
        <div style={{ margin:'10px 0', padding:'8px 10px', background:'#FDECEA', border:'1px solid #E8A09A', borderRadius:'2px', fontSize:'11px', color:'#C62828' }}>
          {erro}
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
        <button onClick={onClose} disabled={saving} className="erp-btn erp-btn-secondary">Cancelar</button>
        <button onClick={handleConfirm} disabled={saving || (forma==='cruzado' && !parteId)} className="erp-btn erp-btn-success">
          {saving ? 'Salvando...' : 'Confirmar Recebimento'}
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
  const handleSubmit = async (e) => {
    e.preventDefault()
    const contas = readLocal('ts_contasReceber', [])
    const p = { ...form, valor:parseFloat(form.valor)||0 }
    try {
      if (initial) { await writeLocal('ts_contasReceber', contas.map(c => c.id===initial.id ? { ...c, ...p } : c)) }
      else { await writeLocal('ts_contasReceber', [...contas, { id:uuid(), status:'aberto', ordemId:null, lancIds:[], formaPagamento:null, baixaCruzadaId:null, ...p }]) }
      onDone(); onClose()
    } catch {
      alert('Erro ao salvar. Verifique a conexão e tente novamente.')
    }
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
  const [clienteModal, setClienteModal] = useState(null)
  const [previewPedido, setPreviewPedido] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [statusFilter, setStatusFilter] = useState('aberto')
  const [monthFilter,  setMonthFilter]  = useState('')
  const categorias = readLocal('ts_categorias', [])
  const clientes   = readLocal('ts_clientes',   [])
  const ordens     = readLocal('ts_ordens',     [])
  const pedidos    = readLocal('ts_pedidos',    [])

  const clienteDaConta = (conta) => {
    // Cliente gravado direto na conta (ex.: importação North Sails)
    if (conta.clienteId) {
      const direto = clientes.find(c => c.id === conta.clienteId)
      if (direto) return direto
    }
    const ordemId  = conta.ordemId  || ordens.find(o => o.contaReceberId === conta.id)?.id
    const pedidoId = conta.pedidoId
    const clienteId = ordens.find(o => o.id === ordemId)?.clienteId
                   ?? pedidos.find(p => p.id === pedidoId)?.clienteId
    return clientes.find(c => c.id === clienteId) || null
  }

  const refresh = () => { setRefreshKey(k => k+1); setContas(readLocal('ts_contasReceber', [])) }

  const hoje = today()
  const isAtrasada = (c) => c.status === 'aberto' && !!c.vencimento && c.vencimento < hoje

  const months     = [...new Set(contas.filter(c => c.vencimento).map(c => c.vencimento.substring(0, 7)))].sort().reverse()
  const baseContas = monthFilter ? contas.filter(c => c.vencimento?.startsWith(monthFilter)) : contas

  const filtered = baseContas.filter(c => {
    if (statusFilter === 'atrasado') return isAtrasada(c)
    return !statusFilter || c.status === statusFilter
  })

  const emAberto  = baseContas.filter(c => c.status==='aberto').reduce((s,c) => s+(c.valor||0), 0)
  const recebido  = baseContas.filter(c => c.status==='confirmado').reduce((s,c) => s+(c.valor||0), 0)
  const emAtraso  = baseContas.filter(isAtrasada).reduce((s,c) => s+(c.valor||0), 0)
  const qtdAtraso = baseContas.filter(isAtrasada).length

  const handleEstorno = async (conta) => {
    try {
      if (conta.formaPagamento==='pix')      { await writeLocal('ts_financeiro', readLocal('ts_financeiro',[]).filter(l=>!conta.lancIds?.includes(l.id))) }
      else if (conta.formaPagamento==='dinheiro') { await writeLocal('ts_caixinha', readLocal('ts_caixinha',[]).filter(l=>!conta.lancIds?.includes(l.id))) }
      else if (conta.formaPagamento==='cruzado')  { await writeLocal('ts_offBook', readLocal('ts_offBook',[]).filter(l=>!conta.lancIds?.includes(l.id))) }
      setContas(prev => prev.map(c => c.id===conta.id ? { ...c, status:'aberto', formaPagamento:null, lancIds:[] } : c))
    } catch {
      alert('Erro ao estornar. Verifique a conexão e tente novamente.')
    }
  }

  const STATUS_TABS = [
    { value:'',          label:'Todos'       },
    { value:'aberto',    label:'Em aberto'   },
    { value:'atrasado',  label:`Em atraso${qtdAtraso > 0 ? ` (${qtdAtraso})` : ''}` },
    { value:'confirmado',label:'Confirmados' },
  ]

  return (
    <div className="erp-fill">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <h2 style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.04em' }}>Contas a Receber</h2>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="erp-btn erp-btn-primary erp-btn-sm">+ Nova Conta</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'16px' }}>
        <StatCard label="Saldo em Aberto" value={emAberto} cls="orange" />
        <StatCard label="Em Atraso"        value={emAtraso} cls="red"    />
        <StatCard label="Total Recebido"   value={recebido} cls="green"  />
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px', marginBottom:'4px' }}>
        <div className="erp-tabs" style={{ marginBottom:'0', borderBottom:'none' }}>
          {STATUS_TABS.map(t => (
            <button key={t.value} onClick={() => setStatusFilter(t.value)} className={`erp-tab ${statusFilter===t.value?'active':''}`}>{t.label}</button>
          ))}
        </div>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="erp-select" style={{ width:'150px' }}>
          <option value="">Todos os meses</option>
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>
      <div style={{ height:'1px', background:'#D8DDE6', marginBottom:'12px' }} />

      <div className="erp-panel erp-panel-fill">
        <table className="erp-table">
          <thead><tr>
            <th>Descrição</th><th style={{ width:'260px' }}>Cliente</th>
            <th style={{ width:'110px' }}>Categoria</th>
            <th style={{ width:'90px' }}>Vencimento</th><th style={{ width:'80px' }}>Pagamento</th>
            <th className="right" style={{ width:'110px' }}>Valor</th>
            <th style={{ width:'90px' }}>Status</th><th style={{ width:'160px' }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length===0 && <tr className="empty"><td colSpan={8}>Nenhuma conta encontrada</td></tr>}
            {filtered.map(conta => {
              const cat        = categorias.find(c => c.id===conta.categoriaId)
              const clienteObj = clienteDaConta(conta)
              const isCruzado  = conta.lancIds?.length>0 && conta.formaPagamento==='cruzado'
              const atrasada   = isAtrasada(conta)
              return (
                <tr key={conta.id} style={atrasada ? { background:'#FFF5F5' } : undefined}>
                  <td>{conta.descricao}</td>
                  <td style={{ maxWidth:'260px' }}>
                    {clienteObj
                      ? <LinkBtn className="ellipsis-cell" style={{ maxWidth:'248px' }} title={clienteObj.nome} onClick={() => setClienteModal(clienteObj)}>{clienteObj.nome}</LinkBtn>
                      : conta.clienteNome
                        ? <span className="ellipsis-cell" style={{ maxWidth:'248px' }} title={conta.clienteNome}>{conta.clienteNome}</span>
                        : <span className="muted">—</span>}
                  </td>
                  <td className="muted">{cat?.nome||'—'}</td>
                  <td style={{ color: atrasada ? '#C62828' : undefined, fontWeight: atrasada ? 600 : undefined }}>
                    {formatDate(conta.vencimento)}
                  </td>
                  <td>{conta.formaPagamento ? <Badge value={conta.formaPagamento}/> : '—'}</td>
                  <td className="right credit">{formatCurrency(conta.valor)}</td>
                  <td>
                    {atrasada
                      ? <span style={{ display:'inline-block', padding:'1px 7px', fontSize:'11px', fontWeight:600, borderRadius:'2px', border:'1px solid #E89088', background:'#FDECEA', color:'#C62828', whiteSpace:'nowrap' }}>Em atraso</span>
                      : <Badge value={conta.status} />}
                  </td>
                  <td>
                    <span style={{ display:'flex', gap:'2px', alignItems:'center' }}>
                      {conta.status==='aberto' && <>
                        <button onClick={() => setBaixaItem(conta)} className="erp-icon-btn green" title="Baixar (registrar recebimento)"><IconDownload /></button>
                        <button onClick={() => { setEditItem(conta); setShowForm(true) }} className="erp-icon-btn" title="Editar"><IconEdit /></button>
                      </>}
                      {conta.status==='confirmado' && <button onClick={() => handleEstorno(conta)} className="erp-icon-btn warn" title="Estornar"><IconUndo /></button>}
                      {isCruzado && <button onClick={() => { const ob=readLocal('ts_offBook',[]); const f=ob.find(i=>(conta.lancIds||[]).includes(i.id)&&i.baixaCruzadaId); if(f?.baixaCruzadaId) setCadeiaId(f.baixaCruzadaId) }} className="erp-icon-btn purple" title="Ver cadeia"><IconLink /></button>}
                      <button onClick={() => setDeleteItem(conta)} className="erp-icon-btn danger" title="Excluir"><IconTrash /></button>
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
      {clienteModal && <ClienteModal cliente={clienteModal} onClose={() => setClienteModal(null)} onOpenPedido={p => { setClienteModal(null); setPreviewPedido(p) }} />}
      {previewPedido && <PreviewModal pedido={previewPedido} onClose={() => setPreviewPedido(null)} />}
    </div>
  )
}
