import { useState } from 'react'
import { useLocalState, readLocal, writeLocal } from '../../hooks/useLocalState'
import { uuid, formatDate, formatCurrency, today } from '../../utils/helpers'
import Badge from '../../components/ui/Badge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'

function StatCard({ label, value, cls }) {
  return (
    <div className={`erp-stat ${cls}`}>
      <div className="s-label">{label}</div>
      <div className="s-value">{formatCurrency(value)}</div>
    </div>
  )
}

function CadeiaModal({ id, onClose }) {
  const offBook    = readLocal('ts_offBook', [])
  const categorias = readLocal('ts_categorias', [])
  const entries    = offBook.filter(i => i.baixaCruzadaId === id)
  return (
    <Modal title="Cadeia de Lançamentos Cruzados" onClose={onClose}>
      <table className="erp-table">
        <thead><tr>
          <th style={{ width:'90px' }}>Data</th><th>Descrição</th>
          <th>Categoria</th><th>Tipo</th><th className="right">Valor</th>
        </tr></thead>
        <tbody>
          {entries.map(e => {
            const cat = categorias.find(c => c.id === e.categoriaId)
            return (
              <tr key={e.id}>
                <td className="muted">{formatDate(e.data)}</td>
                <td>{e.descricao}</td>
                <td className="muted">{cat?.nome||'—'}</td>
                <td><Badge value={e.tipo} /></td>
                <td className={`right ${e.tipo==='receita'?'credit':'debit'}`}>
                  {e.tipo==='receita'?'+':'−'}{formatCurrency(e.valor)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Modal>
  )
}

function EditModal({ item, onClose, onDone }) {
  const [items, setItems] = useLocalState('ts_offBook', [])
  const categorias = readLocal('ts_categorias', [])
  const [form, setForm] = useState({
    tipo:        item.tipo,
    descricao:   item.descricao,
    categoriaId: item.categoriaId || '',
    valor:       item.valor,
    data:        item.data,
  })

  const catsFiltradas = categorias.filter(c =>
    form.tipo === 'receita' ? (c.tipo === 'receita' || c.tipo === 'ambos')
                             : (c.tipo === 'despesa' || c.tipo === 'ambos')
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, ...form, valor: parseFloat(form.valor) || 0 } : i
    ))
    onDone()
    onClose()
  }

  return (
    <Modal title="Editar Lançamento Off Book" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom:'12px' }}>
          <label className="erp-label">Tipo *</label>
          <div style={{ display:'flex', gap:'20px', marginTop:'4px' }}>
            {[['receita','Crédito'],['despesa','Débito']].map(([v,l]) => (
              <label key={v} style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'13px' }}>
                <input type="radio" name="tipo" value={v} checked={form.tipo===v}
                  onChange={() => setForm(f => ({ ...f, tipo:v, categoriaId:'' }))} /> {l}
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:'12px' }}>
          <label className="erp-label">Descrição *</label>
          <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao:e.target.value }))}
            required className="erp-input" />
        </div>
        <div style={{ marginBottom:'12px' }}>
          <label className="erp-label">Categoria</label>
          <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId:e.target.value }))}
            className="erp-select">
            <option value="">Selecione...</option>
            {catsFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div>
            <label className="erp-label">Valor (R$) *</label>
            <input type="number" min="0" step="0.01" value={form.valor}
              onChange={e => setForm(f => ({ ...f, valor:e.target.value }))} required className="erp-input" />
          </div>
          <div>
            <label className="erp-label">Data *</label>
            <input type="date" value={form.data}
              onChange={e => setForm(f => ({ ...f, data:e.target.value }))} required className="erp-input" />
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
          <button type="button" onClick={onClose} className="erp-btn erp-btn-secondary">Cancelar</button>
          <button type="submit" className="erp-btn erp-btn-primary">Salvar</button>
        </div>
      </form>
    </Modal>
  )
}

export default function OffBook() {
  const [items, setItems] = useLocalState('ts_offBook', [])
  const [search,     setSearch]     = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [cadeiaId,   setCadeiaId]   = useState(null)
  const [editItem,   setEditItem]   = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const categorias = readLocal('ts_categorias', [])
  const semParteId = items.filter(i => !i.parteId)

  const filtered = semParteId.filter(i => {
    const cat = categorias.find(c => c.id === i.categoriaId)
    const matchS = !search ||
      i.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      cat?.nome?.toLowerCase().includes(search.toLowerCase())
    return matchS && (!tipoFilter || i.tipo === tipoFilter)
  })

  const totalC = semParteId.filter(i => i.tipo==='receita').reduce((s,i) => s+(i.valor||0), 0)
  const totalD = semParteId.filter(i => i.tipo==='despesa').reduce((s,i) => s+(i.valor||0), 0)
  const saldo  = totalC - totalD

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <h2 style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.04em' }}>Off Book</h2>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px' }}>
        <StatCard label="Total Créditos" value={totalC} cls="green" />
        <StatCard label="Total Débitos"  value={totalD} cls="red"   />
        <StatCard label="Saldo"          value={saldo}  cls={saldo>=0?'blue':'orange'} />
      </div>

      <div className="erp-filter-row">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..." className="erp-input" style={{ width:'240px' }} />
        <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}
          className="erp-select" style={{ width:'140px' }}>
          <option value="">Todos os tipos</option>
          <option value="receita">Créditos</option>
          <option value="despesa">Débitos</option>
        </select>
      </div>

      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th style={{ width:'90px' }}>Data</th><th>Descrição</th>
            <th style={{ width:'140px' }}>Categoria</th>
            <th style={{ width:'80px' }}>Tipo</th>
            <th className="right" style={{ width:'120px' }}>Valor</th>
            <th style={{ width:'140px' }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length===0 && <tr className="empty"><td colSpan={6}>Nenhum lançamento Off Book</td></tr>}
            {[...filtered].reverse().map(item => {
              const cat = categorias.find(c => c.id === item.categoriaId)
              return (
                <tr key={`${item.id}-${refreshKey}`}>
                  <td className="muted">{formatDate(item.data)}</td>
                  <td>{item.descricao}</td>
                  <td className="muted">{cat?.nome||'—'}</td>
                  <td><Badge value={item.tipo} /></td>
                  <td className={`right ${item.tipo==='receita'?'credit':'debit'}`}>
                    {item.tipo==='receita'?'+':'−'}{formatCurrency(item.valor)}
                  </td>
                  <td>
                    <span style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      {item.baixaCruzadaId && (
                        <button onClick={() => setCadeiaId(item.baixaCruzadaId)}
                          className="erp-btn erp-btn-link-purple erp-btn-sm">Ver cadeia</button>
                      )}
                      <button onClick={() => setEditItem(item)}
                        className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                      <button onClick={() => setDeleteItem(item)}
                        className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {cadeiaId && <CadeiaModal id={cadeiaId} onClose={() => setCadeiaId(null)} />}

      {editItem && (
        <EditModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onDone={() => setRefreshKey(k => k+1)}
        />
      )}

      {deleteItem && (
        <ConfirmModal
          title="Excluir Lançamento"
          message={`Excluir "${deleteItem.descricao}"?`}
          danger
          onConfirm={() => setItems(prev => prev.filter(i => i.id !== deleteItem.id))}
          onClose={() => setDeleteItem(null)}
        />
      )}
    </div>
  )
}
