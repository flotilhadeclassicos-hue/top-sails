import { useState, useMemo } from 'react'
import { useLocalState, readLocal } from '../hooks/useLocalState'
import { uuid, formatCurrency, getMonthKey, monthLabel } from '../utils/helpers'

// ── Fonte de dados ────────────────────────────────────────────────────────────
function buildAll(excluirIds) {
  const data = [
    ...readLocal('ts_financeiro', []),
    ...readLocal('ts_caixinha',   []),
    ...readLocal('ts_offBook',    []).filter(i => !i.parteId),
  ]
  return excluirIds?.size ? data.filter(i => !excluirIds.has(i.categoriaId)) : data
}

function getPrIds(categorias) {
  return new Set(categorias.filter(c => c.nome === 'Parte Relacionada').map(c => c.id))
}

// ── Helpers de cálculo ────────────────────────────────────────────────────────
function sumCell(all, catIds, tipo, month) {
  return all
    .filter(i => catIds.includes(i.categoriaId) && i.tipo === tipo &&
      (month ? getMonthKey(i.data) === month : true))
    .reduce((s, i) => s + (i.valor || 0), 0)
}

// ── Config panel: lista de itens com ↑↓ + subtotais ──────────────────────────
function ConfigSection({ title, items, onMove, onAddSubtotal, onRemoveSubtotal, onRenameSubtotal, categorias }) {
  return (
    <div>
      <div style={{ fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' }}>{title}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
        {items.map((item, idx) => (
          <div key={item.type === 'cat' ? item.catId : item.id}
            style={{ display:'flex', alignItems:'center', gap:'6px',
              background: item.type === 'subtotal' ? '#EAF3FB' : '#F4F6F8',
              border: `1px solid ${item.type === 'subtotal' ? '#A8C8E8' : '#E4E7EA'}`,
              padding:'4px 8px', borderRadius:'2px' }}>
            {item.type === 'cat' ? (
              <span style={{ flex:1, fontSize:'12px', color:'#16191F' }}>
                {categorias.find(c => c.id === item.catId)?.nome || '—'}
              </span>
            ) : (
              <>
                <span style={{ fontSize:'11px', color:'#0050A0', fontWeight:700 }}>∑</span>
                <input value={item.label}
                  onChange={e => onRenameSubtotal(item.id, e.target.value)}
                  style={{ flex:1, fontSize:'12px', border:'1px solid #A8C8E8', borderRadius:'2px',
                    padding:'2px 6px', color:'#0050A0', fontWeight:600, background:'#EAF3FB' }} />
                <button onClick={() => onRemoveSubtotal(item.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#C62828', fontSize:'15px', lineHeight:1, padding:'0 2px' }}>×</button>
              </>
            )}
            <div style={{ display:'flex', flexDirection:'column' }}>
              <button onClick={() => onMove(idx, -1)} disabled={idx === 0}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#54698D', fontSize:'11px', lineHeight:1.2, padding:'1px 3px', opacity: idx===0?0.25:1 }}>↑</button>
              <button onClick={() => onMove(idx, 1)} disabled={idx === items.length - 1}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#54698D', fontSize:'11px', lineHeight:1.2, padding:'1px 3px', opacity: idx===items.length-1?0.25:1 }}>↓</button>
            </div>
          </div>
        ))}
        <button onClick={onAddSubtotal}
          style={{ marginTop:'4px', fontSize:'11px', color:'#0070D2', background:'none',
            border:'1px dashed #A8C8E8', borderRadius:'2px', padding:'5px 10px',
            cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
          + Adicionar Subtotal
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Relatorios() {
  const [ano,          setAno]          = useState(new Date().getFullYear())
  const [inclParteRel, setInclParteRel] = useState(false)
  const [showConfig,   setShowConfig]   = useState(false)
  const [refreshKey,   setRefreshKey]   = useState(0)

  // Config: { creditos: ConfigItem[], debitos: ConfigItem[] }
  // ConfigItem: { type:'cat', catId } | { type:'subtotal', id, label }
  const [config, setConfig] = useLocalState('ts_rel_config_v3', {})

  const categorias = readLocal('ts_categorias', [])
  const prIds      = useMemo(() => getPrIds(categorias), [categorias.length])
  const prCat      = categorias.find(c => c.nome === 'Parte Relacionada')

  const all = useMemo(
    () => buildAll(inclParteRel ? null : prIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey, inclParteRel]
  )

  const months = useMemo(
    () => Array.from({ length:12 }, (_, i) => `${ano}-${String(i+1).padStart(2,'0')}`),
    [ano]
  )

  // ── Effective items (config + missing cats) ────────────────────────────────
  const getEffective = (sectionKey, tipo) => {
    const stored = config[sectionKey]

    // Cats that belong to this section — Parte Relacionada tem seção própria, nunca entra aqui
    const sectionCats = categorias.filter(c =>
      c.tipo === tipo && c.nome !== 'Parte Relacionada'
    )

    if (!stored || stored.length === 0) {
      return sectionCats.map(c => ({ type:'cat', catId:c.id }))
    }

    // Remove cat items whose category no longer exists
    const valid = stored.filter(i =>
      i.type === 'subtotal' || sectionCats.some(c => c.id === i.catId)
    )

    // Append cats not yet in config
    const configured = new Set(valid.filter(i => i.type==='cat').map(i => i.catId))
    const missing = sectionCats
      .filter(c => !configured.has(c.id))
      .map(c => ({ type:'cat', catId:c.id }))

    return [...valid, ...missing]
  }

  const creditItems = getEffective('creditos', 'receita')
  const debitItems  = getEffective('debitos',  'despesa')

  // ── Config manipulation ────────────────────────────────────────────────────
  const updateSection = (sectionKey, items) =>
    setConfig(prev => ({ ...prev, [sectionKey]: items }))

  const makeHandlers = (sectionKey, items) => ({
    onMove: (idx, dir) => {
      const next = [...items]
      const to = idx + dir
      if (to < 0 || to >= next.length) return
      ;[next[idx], next[to]] = [next[to], next[idx]]
      updateSection(sectionKey, next)
    },
    onAddSubtotal: () => updateSection(sectionKey,
      [...items, { type:'subtotal', id:uuid(), label:'Subtotal' }]),
    onRemoveSubtotal: (id) => updateSection(sectionKey,
      items.filter(i => !(i.type==='subtotal' && i.id===id))),
    onRenameSubtotal: (id, label) => updateSection(sectionKey,
      items.map(i => i.type==='subtotal' && i.id===id ? { ...i, label } : i)),
  })

  const creditHandlers = makeHandlers('creditos', creditItems)
  const debitHandlers  = makeHandlers('debitos',  debitItems)

  // ── Render table section ───────────────────────────────────────────────────
  const fmt = (v) => v === 0
    ? <span style={{ color:'#C9D3DD' }}>—</span>
    : formatCurrency(v)

  const TH  = { border:'1px solid #D8DDE6', padding:'5px 8px', background:'#F0F2F5', fontSize:'10px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.04em', textAlign:'right', whiteSpace:'nowrap' }
  const THL = { ...TH, textAlign:'left', position:'sticky', left:0, minWidth:'170px', zIndex:1 }
  const TD  = { border:'1px solid #E4E7EA', padding:'4px 8px', fontSize:'12px', textAlign:'right', whiteSpace:'nowrap' }
  const TDL = { ...TD, textAlign:'left', position:'sticky', left:0, background:'#fff', zIndex:1 }
  const SEC = (bgH, textH, borderH) => ({ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', padding:'5px 10px', border:'1px solid #D8DDE6', background:bgH, color:textH, borderLeft:`3px solid ${borderH}` })

  const renderRows = (items, tipo, sectionColor) => {
    let accum = []   // cat IDs since last subtotal
    const rows = []

    items.forEach((item, idx) => {
      if (item.type === 'cat') {
        accum.push(item.catId)
        const cat = categorias.find(c => c.id === item.catId)
        if (!cat) return
        const rowTotal = sumCell(all, [item.catId], tipo, null)
        rows.push(
          <tr key={item.catId} style={{ background: idx%2===0?'#fff':'#FAFBFC' }}>
            <td style={TDL}>{cat.nome}</td>
            {months.map(m => {
              const v = sumCell(all, [item.catId], tipo, m)
              return <td key={m} style={{ ...TD, color: v>0?sectionColor:'#C9D3DD', fontWeight:v>0?600:400 }}>{fmt(v)}</td>
            })}
            <td style={{ ...TD, fontWeight:700, color:sectionColor }}>{fmt(rowTotal)}</td>
          </tr>
        )
      } else {
        // Subtotal row
        const subCatIds = [...accum]
        accum = []
        const subTotal = sumCell(all, subCatIds, tipo, null)
        rows.push(
          <tr key={item.id} style={{ background:'#F0F2F5', borderTop:'2px solid #D8DDE6' }}>
            <td style={{ ...TDL, background:'#F0F2F5', fontWeight:700, fontSize:'11px', color:'#54698D', paddingLeft:'20px', fontStyle:'italic' }}>
              ∑ {item.label}
            </td>
            {months.map(m => {
              const v = sumCell(all, subCatIds, tipo, m)
              return <td key={m} style={{ ...TD, background:'#F0F2F5', fontWeight:700, color:v>0?sectionColor:'#C9D3DD' }}>{fmt(v)}</td>
            })}
            <td style={{ ...TD, background:'#E8EDF2', fontWeight:700, color:'#16191F' }}>{fmt(subTotal)}</td>
          </tr>
        )
      }
    })
    return rows
  }

  const sectionTotal = (tipo, m) =>
    sumCell(all, categorias.map(c => c.id), tipo, m)

  return (
    <div style={{ padding:'20px 24px' }}>
      <nav className="erp-bc">
        <span>Top Sails</span><span className="sep">/</span><span className="cur">Relatórios</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">Fluxo de Caixa Consolidado</h1>
        <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
          {/* Ano */}
          <div style={{ display:'inline-flex', alignItems:'center', border:'1px solid #D8DDE6', borderRadius:'2px', background:'#fff', overflow:'hidden' }}>
            <button onClick={() => setAno(a => a - 1)}
              style={{ padding:'4px 10px', background:'none', border:'none', borderRight:'1px solid #D8DDE6', cursor:'pointer', color:'#54698D', fontSize:'13px' }}>‹</button>
            <span style={{ padding:'4px 16px', fontSize:'12px', fontWeight:700, color:'#16191F', minWidth:'55px', textAlign:'center' }}>{ano}</span>
            <button onClick={() => setAno(a => a + 1)}
              style={{ padding:'4px 10px', background:'none', border:'none', borderLeft:'1px solid #D8DDE6', cursor:'pointer', color:'#54698D', fontSize:'13px' }}>›</button>
          </div>
          {/* Toggle PR */}
          <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#54698D', cursor:'pointer', whiteSpace:'nowrap' }}>
            <input type="checkbox" checked={inclParteRel} onChange={e => setInclParteRel(e.target.checked)} />
            Incluir Parte Relacionada
          </label>
          <button onClick={() => setRefreshKey(k => k + 1)} className="erp-btn erp-btn-secondary erp-btn-sm">↻ Atualizar</button>
          <button onClick={() => setShowConfig(v => !v)}
            className={`erp-btn erp-btn-sm ${showConfig?'erp-btn-primary':'erp-btn-secondary'}`}>
            ⚙ Organizar / Subtotais
          </button>
        </div>
      </div>

      <div style={{ fontSize:'11px', color:'#8A99A8', marginBottom:'12px' }}>
        Consolida: Fluxo de Caixa + Caixinha + Off Book (sem parte relacionada no Off Book)
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="erp-panel" style={{ padding:'16px 20px', marginBottom:'16px' }}>
          <div style={{ fontSize:'12px', fontWeight:700, color:'#16191F', marginBottom:'14px' }}>
            Organizar linhas e Subtotais — use ↑↓ para reordenar, ∑ para nomear subtotais
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
            <ConfigSection title="Créditos" items={creditItems} categorias={categorias} {...creditHandlers} />
            <ConfigSection title="Débitos"  items={debitItems}  categorias={categorias} {...debitHandlers}  />
          </div>
        </div>
      )}

      {/* Report table */}
      <div className="erp-panel" style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
          <thead>
            <tr>
              <th style={THL}>Categoria</th>
              {months.map(m => <th key={m} style={TH}>{monthLabel(m)}</th>)}
              <th style={{ ...TH, background:'#E8EDF2', color:'#16191F' }}>Total</th>
            </tr>
          </thead>
          <tbody>

            {/* ── CRÉDITOS ── */}
            <tr><td colSpan={months.length+2} style={SEC('#F0F7F0','#2E7D32','#2E7D32')}>▲ CRÉDITOS</td></tr>
            {renderRows(creditItems, 'receita', '#2E7D32')}
            <tr style={{ background:'#D6EDD6' }}>
              <td style={{ ...TDL, background:'#D6EDD6', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#1A5C1A' }}>Total Créditos</td>
              {months.map(m => <td key={m} style={{ ...TD, background:'#D6EDD6', color:'#1A5C1A', fontWeight:700 }}>{fmt(sectionTotal('receita', m))}</td>)}
              <td style={{ ...TD, background:'#B8DDB8', color:'#1A5C1A', fontWeight:700 }}>{fmt(sectionTotal('receita', null))}</td>
            </tr>

            {/* ── DÉBITOS ── */}
            <tr><td colSpan={months.length+2} style={SEC('#FDF0F0','#C62828','#C62828')}>▼ DÉBITOS</td></tr>
            {renderRows(debitItems, 'despesa', '#C62828')}
            <tr style={{ background:'#F5C8C8' }}>
              <td style={{ ...TDL, background:'#F5C8C8', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#8B0000' }}>Total Débitos</td>
              {months.map(m => <td key={m} style={{ ...TD, background:'#F5C8C8', color:'#8B0000', fontWeight:700 }}>{fmt(sectionTotal('despesa', m))}</td>)}
              <td style={{ ...TD, background:'#EBA8A8', color:'#8B0000', fontWeight:700 }}>{fmt(sectionTotal('despesa', null))}</td>
            </tr>

            {/* ── PARTE RELACIONADA (seção própria, quando toggle ativo) ── */}
            {inclParteRel && prCat && (() => {
              const prAllIds = categorias.filter(c => c.nome === 'Parte Relacionada').map(c => c.id)
              const prCr = (m) => sumCell(all, prAllIds, 'receita', m)
              const prDb = (m) => sumCell(all, prAllIds, 'despesa', m)
              const prNet= (m) => prCr(m) - prDb(m)
              return (
                <>
                  <tr><td colSpan={months.length+2} style={SEC('#F3EEF8','#4A2080','#6A1B9A')}>◆ PARTE RELACIONADA</td></tr>
                  {/* Linha créditos */}
                  <tr style={{ background:'#F9F7FC' }}>
                    <td style={{ ...TDL, background:'#F9F7FC', paddingLeft:'20px', color:'#2E7D32' }}>↳ Créditos</td>
                    {months.map(m => {
                      const v = prCr(m)
                      return <td key={m} style={{ ...TD, color:v>0?'#2E7D32':'#C9D3DD', fontWeight:v>0?600:400 }}>{fmt(v)}</td>
                    })}
                    <td style={{ ...TD, color:'#2E7D32', fontWeight:700 }}>{fmt(prCr(null))}</td>
                  </tr>
                  {/* Linha débitos */}
                  <tr style={{ background:'#FCF7F7' }}>
                    <td style={{ ...TDL, background:'#FCF7F7', paddingLeft:'20px', color:'#C62828' }}>↳ Débitos</td>
                    {months.map(m => {
                      const v = prDb(m)
                      return <td key={m} style={{ ...TD, color:v>0?'#C62828':'#C9D3DD', fontWeight:v>0?600:400 }}>{fmt(v)}</td>
                    })}
                    <td style={{ ...TD, color:'#C62828', fontWeight:700 }}>{fmt(prDb(null))}</td>
                  </tr>
                  {/* Linha saldo PR */}
                  <tr style={{ background:'#EDE8F5' }}>
                    <td style={{ ...TDL, background:'#EDE8F5', fontSize:'11px', fontWeight:700, color:'#4A2080', textTransform:'uppercase', letterSpacing:'0.04em' }}>Saldo Parte Relacionada</td>
                    {months.map(m => {
                      const s = prNet(m)
                      return <td key={m} style={{ ...TD, background:'#EDE8F5', fontWeight:700, color:s>=0?'#4A2080':'#E65100' }}>{fmt(s)}</td>
                    })}
                    <td style={{ ...TD, background:'#D9CFF0', fontWeight:700, color:prNet(null)>=0?'#4A2080':'#E65100' }}>{fmt(prNet(null))}</td>
                  </tr>
                </>
              )
            })()}

            {/* ── SALDO ── */}
            <tr style={{ borderTop:'2px solid #54698D' }}>
              <td style={{ ...TDL, background:'#E8EDF2', fontSize:'12px', fontWeight:700, color:'#16191F', textTransform:'uppercase', letterSpacing:'0.04em' }}>SALDO</td>
              {months.map(m => {
                const s = sectionTotal('receita', m) - sectionTotal('despesa', m)
                return <td key={m} style={{ ...TD, background:'#E8EDF2', fontWeight:700, color:s>=0?'#0050A0':'#E65100' }}>{fmt(s)}</td>
              })}
              <td style={{ ...TD, background:'#D0D9E4', fontWeight:700,
                color:(sectionTotal('receita',null)-sectionTotal('despesa',null))>=0?'#0050A0':'#E65100' }}>
                {fmt(sectionTotal('receita',null)-sectionTotal('despesa',null))}
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  )
}
