import { useState, useMemo } from 'react'
import { useLocalState, readLocal } from '../hooks/useLocalState'
import { uuid, formatCurrencyInt as formatCurrency, formatCurrency as fmtFull, getMonthKey, monthLabel, currentMonthKey } from '../utils/helpers'

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
// ── Relatório de Vendas (Tabela Dinâmica) ─────────────────────────────────────
function PivotVendas() {
  const [pedidos]  = useLocalState('ts_pedidos', [])
  const [rowDim,   setRowDim]   = useState('cliente')     // 'produto' | 'cliente' | 'mes'
  const [colDim,   setColDim]   = useState('mes')         // 'produto' | 'cliente' | 'mes' | 'nenhum'
  const [measure,  setMeasure]  = useState('faturamento') // 'faturamento' | 'quantidade'

  const clientes = readLocal('ts_clientes', [])

  // Linha plana: um registro por item de pedido
  const flatRows = useMemo(() =>
    pedidos.flatMap(p => {
      const cli = clientes.find(c => c.id === p.clienteId)
      return (p.itens || [])
        .filter(i => i.descricao?.trim())
        .map(i => ({
          produto:     i.descricao.trim(),
          cliente:     cli?.nome || '—',
          mes:         p.data?.substring(0, 7) || '—',
          faturamento: parseFloat(i.precoTotal)  || 0,
          quantidade:  parseFloat(i.quantidade)  || 0,
        }))
    }),
    [pedidos]
  )

  const DIMS = { produto:'Produto', cliente:'Cliente', mes:'Mês' }

  const getVals = (dim) => {
    const s = [...new Set(flatRows.map(r => r[dim]))]
    return dim === 'mes' ? s.sort() : s.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }

  const rowValues = useMemo(() => getVals(rowDim), [flatRows, rowDim])
  const colValues = useMemo(() => colDim !== 'nenhum' ? getVals(colDim) : [], [flatRows, colDim])

  const pivot = useMemo(() => {
    const p = {}
    for (const r of flatRows) {
      const rv = r[rowDim]
      const cv = colDim !== 'nenhum' ? r[colDim] : '_'
      if (!p[rv]) p[rv] = {}
      p[rv][cv] = (p[rv][cv] || 0) + r[measure]
    }
    return p
  }, [flatRows, rowDim, colDim, measure])

  const cell      = (rv, cv) => pivot[rv]?.[cv] || 0
  const rowTotal  = (rv) => (colDim !== 'nenhum' ? colValues : ['_']).reduce((s, cv) => s + cell(rv, cv), 0)
  const colTotal  = (cv) => rowValues.reduce((s, rv) => s + cell(rv, cv), 0)
  const grandTotal = rowValues.reduce((s, rv) => s + rowTotal(rv), 0)

  const fmt = (v) => measure === 'faturamento'
    ? new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 }).format(v)
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits:1 }).format(v)

  const colHeader = (cv) => {
    if (colDim === 'mes') {
      const [y, m] = cv.split('-')
      return `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+m-1]}/${y.slice(2)}`
    }
    return cv
  }

  const invert = () => {
    if (colDim === 'nenhum') return
    const tmp = rowDim; setRowDim(colDim); setColDim(tmp)
  }

  const dimOpts = Object.entries(DIMS).filter(([k]) => k !== rowDim || colDim === 'nenhum')

  const Sel = ({ label, value, onChange, opts }) => (
    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
      <span style={{ fontSize:'11px', color:'#54698D', fontWeight:600 }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="erp-select" style={{ width:'130px' }}>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )

  const thStyle = { background:'#F0F2F5', border:'1px solid #D8DDE6', padding:'6px 10px',
    fontSize:'11px', fontWeight:700, color:'#16191F', whiteSpace:'nowrap' }
  const tdStyle = (highlight) => ({
    border:'1px solid #E4E7EA', padding:'5px 10px', fontSize:'12px',
    textAlign:'right', fontVariantNumeric:'tabular-nums',
    background: highlight ? '#F0F2F5' : 'transparent',
    fontWeight: highlight ? 700 : 400,
    color: highlight ? '#16191F' : '#54698D',
  })

  if (flatRows.length === 0) {
    return <div style={{ padding:'40px', textAlign:'center', color:'#8A99A8', fontSize:'13px' }}>
      Nenhum item de pedido encontrado. Crie pedidos com itens para ver o relatório.
    </div>
  }

  return (
    <div>
      {/* Controles */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'12px', alignItems:'center', marginBottom:'16px',
        padding:'12px 14px', background:'#F4F6F8', border:'1px solid #D8DDE6', borderRadius:'2px' }}>
        <Sel label="Linhas (↕)" value={rowDim} onChange={v => { setRowDim(v); if (v === colDim) setColDim('nenhum') }}
          opts={Object.entries(DIMS)} />
        <Sel label="Colunas (↔)" value={colDim}
          onChange={v => { setColDim(v); if (v === rowDim) setRowDim(Object.keys(DIMS).find(k => k !== v)) }}
          opts={[...Object.entries(DIMS).filter(([k]) => k !== rowDim), ['nenhum', '— Sem coluna —']]} />
        <Sel label="Medida" value={measure} onChange={setMeasure}
          opts={[['faturamento','Faturamento (R$)'], ['quantidade','Quantidade']]} />
        <button onClick={invert} disabled={colDim === 'nenhum'} className="erp-btn erp-btn-secondary erp-btn-sm"
          title="Inverter linhas e colunas">
          ⇄ Inverter eixos
        </button>
        <span style={{ fontSize:'11px', color:'#8A99A8', marginLeft:'auto' }}>
          {flatRows.length} itens · {pedidos.length} pedidos
        </span>
      </div>

      {/* Tabela pivot */}
      <div style={{ overflowX:'auto', border:'1px solid #D8DDE6', borderRadius:'2px' }}>
        <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'12px' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign:'left', minWidth:'160px' }}>{DIMS[rowDim]}</th>
              {colValues.map(cv => (
                <th key={cv} style={thStyle}>{colHeader(cv)}</th>
              ))}
              <th style={{ ...thStyle, color:'#0050A0' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rowValues.map((rv, ri) => (
              <tr key={rv} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFBFC' }}
                onMouseEnter={e => e.currentTarget.style.background='#EAF3FB'}
                onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? '#fff' : '#FAFBFC'}>
                <td style={{ border:'1px solid #E4E7EA', padding:'5px 10px', fontSize:'12px',
                  fontWeight:500, color:'#16191F', whiteSpace:'nowrap' }}>{rv}</td>
                {colValues.map(cv => (
                  <td key={cv} style={tdStyle(false)}>
                    {cell(rv, cv) > 0 ? fmt(cell(rv, cv)) : <span style={{ color:'#C9D3DD' }}>—</span>}
                  </td>
                ))}
                <td style={tdStyle(true)}>{fmt(rowTotal(rv))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background:'#EAF3FB' }}>
              <td style={{ ...thStyle, textAlign:'left', color:'#0050A0' }}>Total</td>
              {colValues.map(cv => (
                <td key={cv} style={{ ...thStyle, color:'#0070D2', textAlign:'right' }}>{fmt(colTotal(cv))}</td>
              ))}
              <td style={{ ...thStyle, color:'#0070D2', textAlign:'right', fontSize:'13px' }}>{fmt(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Base NFs ──────────────────────────────────────────────────────────────────
function BaseNFs() {
  const [mes, setMes] = useState(currentMonthKey())

  const rows = useMemo(() => {
    const financeiro = readLocal('ts_financeiro',    [])
    const contas     = readLocal('ts_contasReceber', [])
    const ordens     = readLocal('ts_ordens',        [])
    const clientes   = readLocal('ts_clientes',      [])

    return financeiro
      .filter(l => l.tipo === 'receita' && l.contaId && (!mes || l.data?.startsWith(mes)))
      .map(lanc => {
        const conta = contas.find(c => c.id === lanc.contaId)
        if (!conta?.ordemId) return null
        const ordem = ordens.find(o => o.id === conta.ordemId)
        if (!ordem) return null
        const cliente  = clientes.find(c => c.id === ordem.clienteId)
        const endereco = [
          cliente?.logradouro, cliente?.numero, cliente?.complemento,
          cliente?.bairro, cliente?.cidade, cliente?.uf,
        ].filter(Boolean).join(', ')
        return {
          nome:        cliente?.nome       || '—',
          cpf:         cliente?.cpf        || '—',
          endereco:    endereco            || '—',
          os:          ordem.numero        || '—',
          valor:       ordem.valor         || 0,
          observacao:  ordem.descricao      || '—',
        }
      })
      .filter(Boolean)
  }, [mes])

  const total = rows.reduce((s, r) => s + r.valor, 0)

  const exportCSV = () => {
    const header = ['Nome Completo', 'CPF', 'Endereço', 'Ordem de Serviço', 'Valor', 'Observação']
    const linhas = rows.map(r => [
      r.nome, r.cpf, r.endereco, r.os,
      r.valor.toFixed(2).replace('.', ','),
      r.observacao,
    ])
    const csv = [header, ...linhas]
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `base-nfs-${mes || 'todos'}.csv`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em' }}>Mês:</span>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="erp-input" style={{ width:'150px' }} />
          <button onClick={() => setMes('')} className="erp-btn erp-btn-secondary erp-btn-sm">Todos</button>
        </div>
        <button onClick={exportCSV} disabled={rows.length === 0}
          className="erp-btn erp-btn-success erp-btn-sm">
          ↓ Exportar Excel (.csv)
        </button>
      </div>

      <div style={{ fontSize:'12px', color:'#54698D', marginBottom:'12px' }}>
        {rows.length} {rows.length === 1 ? 'registro' : 'registros'}
        {rows.length > 0 && <> · Total: <strong style={{ color:'#16191F' }}>{fmtFull(total)}</strong></>}
      </div>

      <div className="erp-panel" style={{ overflowX:'auto' }}>
        <table className="erp-table">
          <thead>
            <tr>
              <th style={{ textAlign:'left', minWidth:'180px' }}>Nome Completo</th>
              <th style={{ minWidth:'130px' }}>CPF</th>
              <th style={{ minWidth:'220px' }}>Endereço</th>
              <th style={{ minWidth:'130px' }}>Ordem de Serviço</th>
              <th className="right" style={{ minWidth:'120px' }}>Valor</th>
              <th style={{ minWidth:'180px' }}>Observação</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr className="empty">
                <td colSpan={6}>
                  {mes
                    ? `Nenhuma OS recebida em Bancos em ${monthLabel(mes)}`
                    : 'Nenhuma OS recebida em Bancos'}
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight:500 }}>{r.nome}</td>
                <td className="muted">{r.cpf}</td>
                <td className="muted" style={{ fontSize:'11px' }}>{r.endereco}</td>
                <td className="mono">{r.os}</td>
                <td className="right credit" style={{ fontWeight:600 }}>{fmtFull(r.valor)}</td>
                <td className="muted" style={{ fontSize:'11px' }}>{r.observacao}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ background:'#F0F2F5' }}>
                <td colSpan={4} style={{ padding:'5px 10px', fontSize:'11px', fontWeight:700, color:'#54698D', textAlign:'right' }}>Total</td>
                <td className="right" style={{ padding:'5px 10px', fontWeight:700, color:'#2E7D32', fontSize:'12px' }}>{fmtFull(total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

// ── Fluxo de Caixa ────────────────────────────────────────────────────────────
export default function Relatorios() {
  const [tabRel, setTabRel] = useState('fluxo') // 'fluxo' | 'vendas'

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
    const rows = []

    items.forEach((item, idx) => {
      if (item.type === 'cat') {
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
        // Subtotal como cabeçalho: soma as categorias ABAIXO dele, até o próximo subtotal
        const subCatIds = []
        for (let j = idx + 1; j < items.length; j++) {
          if (items[j].type === 'subtotal') break
          if (items[j].type === 'cat') subCatIds.push(items[j].catId)
        }
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
        <span>TOP SAIL</span><span className="sep">/</span><span className="cur">Relatórios</span>
      </nav>
      <div className="erp-toolbar" style={{ marginBottom:'0' }}>
        <h1 className="erp-page-title">Relatórios</h1>
      </div>

      <div className="erp-tabs" style={{ marginBottom:'16px' }}>
        <button onClick={() => setTabRel('fluxo')}   className={`erp-tab ${tabRel==='fluxo'   ?'active':''}`}>Fluxo de Caixa</button>
        <button onClick={() => setTabRel('vendas')}  className={`erp-tab ${tabRel==='vendas'  ?'active':''}`}>Relatório de Vendas</button>
        <button onClick={() => setTabRel('baseNfs')} className={`erp-tab ${tabRel==='baseNfs' ?'active':''}`}>Base NFs</button>
      </div>

      {tabRel === 'vendas'  && <PivotVendas />}
      {tabRel === 'baseNfs' && <BaseNFs />}
      {tabRel === 'fluxo' && <div>
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

            {/* ── DÉBITOS ── */}
            <tr><td colSpan={months.length+2} style={SEC('#FDF0F0','#C62828','#C62828')}>▼ DÉBITOS</td></tr>
            {renderRows(debitItems, 'despesa', '#C62828')}

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
      </div>} {/* fim tabRel === 'fluxo' */}
    </div>
  )
}
