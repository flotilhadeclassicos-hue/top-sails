import { useState } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { formatDate, formatCurrency, monthLabel } from '../../utils/helpers'
import Badge from '../../components/ui/Badge'

const FONTES = {
  financeiro: { label:'Bancos',   cor:'#0070D2', bg:'#EAF3FB' },
  caixinha:   { label:'Caixinha', cor:'#2E7D32', bg:'#EFFFEF' },
  reserva:    { label:'Reserva',  cor:'#B45309', bg:'#FEF3C7' },
  offbook:    { label:'Off Book', cor:'#6A1B9A', bg:'#F3EEF8' },
}

function StatCard({ label, value, color }) {
  const cols = {
    green:  'bg-green-50 border-green-400 text-green-700',
    red:    'bg-red-50 border-red-400 text-red-700',
    blue:   'bg-blue-50 border-blue-500 text-blue-700',
    orange: 'bg-orange-50 border-orange-400 text-orange-700',
  }
  return (
    <div className={`erp-stat ${color}`}>
      <div className="s-label">{label}</div>
      <div className="s-value">{formatCurrency(value)}</div>
    </div>
  )
}

export default function ConsolidadoView() {
  const [search,      setSearch]      = useState('')
  const [tipoFilter,  setTipoFilter]  = useState('')
  const [fonteFilter, setFonteFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')

  const [categorias]  = useLocalState('ts_categorias', [])
  const [financeiro]  = useLocalState('ts_financeiro', [])
  const [caixinha]    = useLocalState('ts_caixinha',   [])
  const [reserva]     = useLocalState('ts_reserva',    [])
  const [offBookRaw]  = useLocalState('ts_offBook',    [])

  // Monta lista consolidada com fonte (Caixinha USD excluída — não consolidada)
  const all = [
    ...financeiro.map(i => ({ ...i, _fonte:'financeiro' })),
    ...caixinha.map(i =>   ({ ...i, _fonte:'caixinha'   })),
    ...reserva.map(i =>    ({ ...i, _fonte:'reserva'    })),
    ...offBookRaw.filter(i => !i.parteId).map(i => ({ ...i, _fonte:'offbook' })),
  ].sort((a, b) => (b.data || '').localeCompare(a.data || ''))

  const months     = [...new Set(all.filter(i => i.data).map(i => i.data.substring(0, 7)))].sort().reverse()
  const monthAll   = monthFilter ? all.filter(i => i.data?.startsWith(monthFilter)) : all

  const filtered = monthAll.filter(i => {
    const cat = categorias.find(c => c.id === i.categoriaId)
    const matchS = !search ||
      i.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      cat?.nome?.toLowerCase().includes(search.toLowerCase())
    const matchT = !tipoFilter  || i.tipo   === tipoFilter
    const matchF = !fonteFilter || i._fonte === fonteFilter
    return matchS && matchT && matchF
  })

  const totalC = monthAll.filter(i => i.tipo === 'receita').reduce((s, i) => s + (i.valor || 0), 0)
  const totalD = monthAll.filter(i => i.tipo === 'despesa').reduce((s, i) => s + (i.valor || 0), 0)
  const saldo  = totalC - totalD

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <h2 style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.04em' }}>
          Consolidado — Bancos + Caixinha + Reserva + Off Book
        </h2>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px' }}>
        <StatCard label="Total Créditos" value={totalC} color="green" />
        <StatCard label="Total Débitos"  value={totalD} color="red"   />
        <StatCard label="Saldo"          value={saldo}  color={saldo >= 0 ? 'blue' : 'orange'} />
      </div>

      {/* Legendas de fonte */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
        {Object.entries(FONTES).map(([key, f]) => (
          <span key={key} style={{ display:'inline-flex', alignItems:'center', gap:'5px',
            fontSize:'11px', padding:'2px 8px', borderRadius:'2px',
            background:f.bg, border:`1px solid ${f.cor}`, color:f.cor, fontWeight:600 }}>
            <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:f.cor, display:'inline-block' }} />
            {f.label}
          </span>
        ))}
      </div>

      <div className="erp-filter-row">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..." className="erp-input" style={{ width:'180px' }} />
        <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}
          className="erp-select" style={{ width:'120px' }}>
          <option value="">Todos tipos</option>
          <option value="receita">Créditos</option>
          <option value="despesa">Débitos</option>
        </select>
        <select value={fonteFilter} onChange={e => setFonteFilter(e.target.value)}
          className="erp-select" style={{ width:'130px' }}>
          <option value="">Todas as contas</option>
          {Object.entries(FONTES).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
        </select>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="erp-select" style={{ width:'140px' }}>
          <option value="">Todos os meses</option>
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th style={{ width:'90px' }}>Data</th>
            <th style={{ width:'120px' }}>Conta</th>
            <th>Descrição</th>
            <th style={{ width:'130px' }}>Categoria</th>
            <th style={{ width:'80px' }}>Tipo</th>
            <th className="right" style={{ width:'120px' }}>Valor</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr className="empty"><td colSpan={6}>Nenhum lançamento encontrado</td></tr>}
            {filtered.map((item, idx) => {
              const cat   = categorias.find(c => c.id === item.categoriaId)
              const fonte = FONTES[item._fonte]
              return (
                <tr key={`${item._fonte}-${item.id}`}>
                  <td className="muted">{formatDate(item.data)}</td>
                  <td>
                    <span style={{ display:'inline-block', fontSize:'10px', fontWeight:700,
                      padding:'1px 6px', borderRadius:'2px',
                      background:fonte?.bg, color:fonte?.cor, border:`1px solid ${fonte?.cor}`,
                      whiteSpace:'nowrap' }}>
                      {fonte?.label}
                    </span>
                  </td>
                  <td>{item.descricao}</td>
                  <td className="muted">{cat?.nome || '—'}</td>
                  <td><Badge value={item.tipo} /></td>
                  <td className={`right ${item.tipo === 'receita' ? 'credit' : 'debit'}`} style={{ fontWeight:600 }}>
                    {item.tipo === 'receita' ? '+' : '−'}{formatCurrency(item.valor)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
