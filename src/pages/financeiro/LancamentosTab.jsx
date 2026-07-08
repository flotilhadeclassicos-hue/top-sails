import { useState, useCallback } from 'react'
import { useLocalState, readLocal, writeLocal } from '../../hooks/useLocalState'
import { uuid, formatDate, formatCurrency, today, monthLabel } from '../../utils/helpers'
import Modal, { ConfirmModal } from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import SortTh, { useSortable } from '../../components/ui/SortTh'
import { PreviewModal } from '../Pedidos'

function StatCard({ label, value, cls }) {
  return (
    <div className={`erp-stat ${cls}`}>
      <div className="s-label">{label}</div>
      <div className="s-value">{formatCurrency(value)}</div>
    </div>
  )
}

function FormModal({ initial, storageKey, onClose }) {
  const [items]      = useLocalState(storageKey, [])
  const [categorias] = useLocalState('ts_categorias', [])
  const [partes]     = useLocalState('ts_partes', [])

  const [form, setForm] = useState(() => initial
    ? { tipo:initial.tipo, descricao:initial.descricao, categoriaId:initial.categoriaId, parteId:initial.parteId||'', valor:initial.valor, data:initial.data }
    : { tipo:'receita', descricao:'', categoriaId:'', parteId:'', valor:'', data:today() }
  )

  const catsFiltradas = categorias.filter(c =>
    form.tipo === 'receita' ? (c.tipo === 'receita' || c.tipo === 'ambos') : (c.tipo === 'despesa' || c.tipo === 'ambos')
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    const valor   = parseFloat(form.valor) || 0
    const parteId = form.parteId || null
    const mainId  = initial?.id || uuid()

    // Contrapartida na parte relacionada (espelho em ts_offBook, tipo oposto):
    // débito no caixa → crédito na parte; crédito no caixa → débito na parte.
    const ob = readLocal('ts_offBook', [])
    const espelhoExistente = initial?.parteLancId || null
    let novoOb = ob
    let parteLancId = null
    if (parteId) {
      parteLancId = espelhoExistente || uuid()
      const espelho = {
        id: parteLancId,
        tipo: form.tipo === 'despesa' ? 'receita' : 'despesa',
        descricao: form.descricao,
        categoriaId: form.categoriaId,
        parteId,
        valor,
        data: form.data,
        baixaCruzadaId: null,
        contaId: null,
        origemStore: storageKey,
        origemId: mainId,
      }
      novoOb = ob.some(i => i.id === parteLancId)
        ? ob.map(i => i.id === parteLancId ? espelho : i)
        : [...ob, espelho]
    } else if (espelhoExistente) {
      // Parte relacionada removida na edição → apaga o espelho
      novoOb = ob.filter(i => i.id !== espelhoExistente)
    }
    if (novoOb !== ob) writeLocal('ts_offBook', novoOb)

    const payload = { ...form, valor, parteId, parteLancId }
    if (initial) {
      writeLocal(storageKey, items.map(i => i.id === initial.id ? { ...i, ...payload } : i))
    } else {
      writeLocal(storageKey, [...items, { id:mainId, baixaCruzadaId:null, contaId:null, ...payload }])
    }
    onClose()
  }

  return (
    <Modal title={initial ? 'Editar Lançamento' : 'Novo Lançamento'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom:'12px' }}>
          <label className="erp-label">Tipo *</label>
          <div style={{ display:'flex', gap:'20px', marginTop:'4px' }}>
            {[['receita','Crédito (Receita)'],['despesa','Débito (Despesa)']].map(([v,l]) => (
              <label key={v} style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'13px', color:'#16191F' }}>
                <input type="radio" name="tipo" value={v} checked={form.tipo===v} onChange={() => setForm(f => ({ ...f, tipo:v, categoriaId:'' }))} />
                {l}
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:'12px' }}>
          <label className="erp-label">Descrição *</label>
          <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao:e.target.value }))} required className="erp-input" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div>
            <label className="erp-label">Categoria</label>
            <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId:e.target.value }))} className="erp-select">
              <option value="">Selecione...</option>
              {catsFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="erp-label">Parte Relacionada</label>
            <select value={form.parteId} onChange={e => setForm(f => ({ ...f, parteId:e.target.value }))} className="erp-select">
              <option value="">Nenhuma</option>
              {partes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div>
            <label className="erp-label">Valor (R$) *</label>
            <input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor:e.target.value }))} required className="erp-input" />
          </div>
          <div>
            <label className="erp-label">Data *</label>
            <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data:e.target.value }))} required className="erp-input" />
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
          <button type="button" onClick={onClose} className="erp-btn erp-btn-secondary">Cancelar</button>
          <button type="submit" className="erp-btn erp-btn-primary">{initial ? 'Salvar' : 'Lançar'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal de visualização (leitura) com documentos precedentes ───────────────
function LancamentoViewModal({ item, categorias, onClose, onEdit, onOpenPedido }) {
  const cat    = categorias.find(c => c.id === item.categoriaId)
  const partes = readLocal('ts_partes', [])
  const parte  = partes.find(p => p.id === item.parteId)

  const contas   = readLocal('ts_contasReceber', [])
  const ordens   = readLocal('ts_ordens', [])
  const pedidos  = readLocal('ts_pedidos', [])
  const clientes = readLocal('ts_clientes', [])
  const cliNome  = (id) => clientes.find(c => c.id === id)?.nome || '—'

  // Cadeia de precedência: lançamento ← Conta a Receber ← OS ← Pedido
  const conta  = item.contaId ? contas.find(c => c.id === item.contaId) : null
  const ordem  = conta ? (ordens.find(o => o.id === conta.ordemId) || ordens.find(o => o.contaReceberId === conta.id)) : null
  const pedido = ordem ? pedidos.find(p => p.id === ordem.pedidoId)
               : (conta?.pedidoId ? pedidos.find(p => p.id === conta.pedidoId) : null)

  const precedentes = []
  if (pedido) precedentes.push({ tipo:'Pedido',           numero:pedido.numero, desc:cliNome(pedido.clienteId), valor:pedido.total, data:pedido.data,          onClick:() => onOpenPedido(pedido) })
  if (ordem)  precedentes.push({ tipo:'Ordem de Serviço', numero:ordem.numero,  desc:ordem.descricao || cliNome(ordem.clienteId), valor:ordem.valor,  data:ordem.dataRetirada })
  if (conta)  precedentes.push({ tipo:'Conta a Receber',  numero:conta.formaPagamento ? conta.formaPagamento.toUpperCase() : '—', desc:conta.descricao, valor:conta.valor, data:conta.vencimento })

  const Campo = ({ label, children, mono }) => (
    <div style={{ display:'flex', gap:'8px', padding:'7px 0', borderBottom:'1px solid #F0F2F5' }}>
      <span style={{ fontSize:'11px', color:'#54698D', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', minWidth:'130px', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:'13px', color:'#16191F', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: mono ? 700 : 400 }}>{children}</span>
    </div>
  )

  return (
    <Modal title="Lançamento" onClose={onClose} size="md">
      <div style={{ padding:'4px 0' }}>
        <Campo label="Data">{formatDate(item.data)}</Campo>
        <Campo label="Descrição">{item.descricao || '—'}</Campo>
        <Campo label="Categoria">{cat?.nome || '—'}</Campo>
        <Campo label="Tipo"><Badge value={item.tipo} /></Campo>
        <Campo label="Valor">
          <span style={{ color: item.tipo==='receita' ? '#2E7D32' : '#C62828', fontWeight:700 }}>
            {item.tipo==='receita' ? '+' : '−'}{formatCurrency(item.valor)}
          </span>
        </Campo>
        {parte && <Campo label="Parte Relacionada">{parte.nome}</Campo>}
      </div>

      {/* Documentos precedentes */}
      <div style={{ marginTop:'16px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' }}>
          Documentos precedentes
        </div>
        {precedentes.length === 0 ? (
          <div style={{ fontSize:'12px', color:'#8A99A8', padding:'8px 0' }}>
            Nenhum documento precedente (lançamento avulso).
          </div>
        ) : (
          <div className="erp-panel">
            <table className="erp-table">
              <thead><tr>
                <th style={{ width:'140px' }}>Documento</th>
                <th style={{ width:'120px' }}>Número</th>
                <th>Descrição / Cliente</th>
                <th style={{ width:'90px' }}>Data</th>
                <th className="right" style={{ width:'110px' }}>Valor</th>
              </tr></thead>
              <tbody>
                {precedentes.map((p, i) => (
                  <tr key={i}>
                    <td>{p.tipo}</td>
                    <td className="mono">
                      {p.onClick
                        ? <button onClick={p.onClick} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'monospace', color:'#0070D2', fontWeight:700, fontSize:'12px', padding:0, textDecoration:'underline' }}>{p.numero}</button>
                        : <span style={{ fontFamily:'monospace', fontWeight:600 }}>{p.numero}</span>}
                    </td>
                    <td className="muted" style={{ maxWidth:'260px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={p.desc}>{p.desc || '—'}</td>
                    <td className="muted">{formatDate(p.data)}</td>
                    <td className="right" style={{ fontWeight:600 }}>{formatCurrency(p.valor || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
        <button onClick={onClose} className="erp-btn erp-btn-secondary">Fechar</button>
        <button onClick={() => onEdit(item)} className="erp-btn erp-btn-primary">Editar</button>
      </div>
    </Modal>
  )
}

export default function LancamentosTab({ storageKey, title }) {
  const [items, setItems] = useLocalState(storageKey, [])
  const [search,      setSearch]      = useState('')
  const [tipoFilter,  setTipoFilter]  = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [editItem,    setEditItem]    = useState(null)
  const [deleteItem,  setDeleteItem]  = useState(null)
  const [viewItem,    setViewItem]    = useState(null)
  const [previewPedido, setPreviewPedido] = useState(null)

  const [categorias] = useLocalState('ts_categorias', [])

  const months = [...new Set(items.filter(i => i.data).map(i => i.data.substring(0, 7)))].sort().reverse()
  const monthItems = monthFilter ? items.filter(i => i.data?.startsWith(monthFilter)) : items

  const filtered = monthItems.filter(i => {
    const cat = categorias.find(c => c.id === i.categoriaId)
    const matchS = !search || i.descricao?.toLowerCase().includes(search.toLowerCase()) || cat?.nome?.toLowerCase().includes(search.toLowerCase())
    const matchT = !tipoFilter || i.tipo === tipoFilter
    return matchS && matchT
  })

  // Ordenação por qualquer coluna — padrão: data do mais recente ao mais antigo
  const getValue = useCallback((i, key) => {
    switch (key) {
      case 'data':      return i.data || ''
      case 'descricao': return i.descricao || ''
      case 'categoria': return categorias.find(c => c.id === i.categoriaId)?.nome || ''
      case 'tipo':      return i.tipo || ''
      case 'valor':     return i.valor || 0
      default:          return ''
    }
  }, [categorias])
  const { sorted, sort, onSort } = useSortable(filtered, { key:'data', dir:'desc' }, getValue)

  const totalC = monthItems.filter(i => i.tipo==='receita').reduce((s,i) => s+(i.valor||0), 0)
  const totalD = monthItems.filter(i => i.tipo==='despesa').reduce((s,i) => s+(i.valor||0), 0)
  const saldo  = totalC - totalD

  return (
    <div className="erp-fill">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <h2 style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.04em' }}>{title}</h2>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="erp-btn erp-btn-primary erp-btn-sm">+ Novo Lançamento</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px' }}>
        <StatCard label="Total Créditos" value={totalC} cls="green" />
        <StatCard label="Total Débitos"  value={totalD} cls="red"   />
        <StatCard label="Saldo"          value={saldo}  cls={saldo>=0?'blue':'orange'} />
      </div>

      <div className="erp-filter-row">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="erp-input" style={{ width:'200px' }} />
        <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} className="erp-select" style={{ width:'130px' }}>
          <option value="">Todos os tipos</option>
          <option value="receita">Créditos</option>
          <option value="despesa">Débitos</option>
        </select>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="erp-select" style={{ width:'140px' }}>
          <option value="">Todos os meses</option>
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      <div className="erp-panel erp-panel-fill">
        <table className="erp-table">
          <thead>
            <tr>
              <SortTh col="data"      label="Data"      sort={sort} onSort={onSort} style={{ width:'90px' }} />
              <SortTh col="descricao" label="Descrição" sort={sort} onSort={onSort} />
              <SortTh col="categoria" label="Categoria" sort={sort} onSort={onSort} style={{ width:'140px' }} />
              <SortTh col="tipo"      label="Tipo"      sort={sort} onSort={onSort} style={{ width:'80px' }} />
              <SortTh col="valor"     label="Valor"     sort={sort} onSort={onSort} align="right" className="right" style={{ width:'120px' }} />
              <th style={{ width:'100px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length===0 && <tr className="empty"><td colSpan={6}>Nenhum lançamento</td></tr>}
            {sorted.map(item => {
              const cat = categorias.find(c => c.id === item.categoriaId)
              return (
                <tr key={item.id} onClick={() => setViewItem(item)} style={{ cursor:'pointer' }}>
                  <td className="muted">{formatDate(item.data)}</td>
                  <td>{item.descricao}</td>
                  <td className="muted">{cat?.nome||'—'}</td>
                  <td><Badge value={item.tipo} /></td>
                  <td className={`right ${item.tipo==='receita'?'credit':'debit'}`}>
                    {item.tipo==='receita'?'+':'−'}{formatCurrency(item.valor)}
                  </td>
                  <td className="right">
                    <span style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                      <button onClick={(e) => { e.stopPropagation(); setEditItem(item); setShowForm(true) }} className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }} className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {viewItem && (
        <LancamentoViewModal
          item={viewItem}
          categorias={categorias}
          onClose={() => setViewItem(null)}
          onEdit={(it) => { setViewItem(null); setEditItem(it); setShowForm(true) }}
          onOpenPedido={(p) => { setViewItem(null); setPreviewPedido(p) }}
        />
      )}
      {previewPedido && <PreviewModal pedido={previewPedido} onClose={() => setPreviewPedido(null)} />}
      {showForm && <FormModal initial={editItem} storageKey={storageKey} onClose={() => setShowForm(false)} />}
      {deleteItem && (
        <ConfirmModal title="Excluir Lançamento" message={`Excluir "${deleteItem.descricao}"?`} danger
          onConfirm={() => {
            if (deleteItem.parteLancId) writeLocal('ts_offBook', readLocal('ts_offBook', []).filter(i => i.id !== deleteItem.parteLancId))
            setItems(prev => prev.filter(i => i.id !== deleteItem.id))
          }}
          onClose={() => setDeleteItem(null)} />
      )}
    </div>
  )
}
