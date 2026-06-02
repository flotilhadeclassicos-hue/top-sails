import { useState, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { formatCurrencyInt as formatCurrency, formatDate, currentMonthKey, monthLabel } from '../utils/helpers'
import ChevronKPI from '../components/ui/ChevronKPI'

const todayStr = () => new Date().toISOString().split('T')[0]

function MonthSelector({ value, onChange }) {
  const prev = () => {
    const [y, m] = value.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const next = () => {
    const [y, m] = value.split('-').map(Number)
    const d = new Date(y, m, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return (
    <div style={{ display:'inline-flex', alignItems:'center', border:'1px solid #D8DDE6', borderRadius:'2px', background:'#fff', overflow:'hidden' }}>
      <button onClick={prev} style={{ padding:'4px 10px', background:'none', border:'none', borderRight:'1px solid #D8DDE6', cursor:'pointer', color:'#54698D', fontSize:'13px' }}>‹</button>
      <span style={{ padding:'4px 16px', fontSize:'12px', fontWeight:700, color:'#16191F', minWidth:'90px', textAlign:'center' }}>{monthLabel(value)}</span>
      <button onClick={next} style={{ padding:'4px 10px', background:'none', border:'none', borderLeft:'1px solid #D8DDE6', cursor:'pointer', color:'#54698D', fontSize:'13px' }}>›</button>
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subLabel, color, icon, onClick }) {
  const colors = {
    red:    { bg:'#FDECEA', border:'#E89088', text:'#8B0000', val:'#C62828' },
    orange: { bg:'#FEF3CD', border:'#E0A000', text:'#5F4000', val:'#E65100' },
    green:  { bg:'#EFFFEF', border:'#88C088', text:'#1A5C1A', val:'#2E7D32' },
    blue:   { bg:'#EAF3FB', border:'#A8C8E8', text:'#0050A0', val:'#0070D2' },
    gray:   { bg:'#F4F6F8', border:'#ADADAD', text:'#444444', val:'#54698D' },
    purple: { bg:'#F3EEF8', border:'#B89CC8', text:'#4A2080', val:'#6A1B9A' },
  }
  const c = colors[color] || colors.gray
  return (
    <div onClick={onClick}
      style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:'2px',
        padding:'8px 11px', cursor: onClick ? 'pointer' : 'default',
        transition:'box-shadow .15s', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}
      onMouseEnter={e => { if(onClick) e.currentTarget.style.boxShadow='0 3px 8px rgba(0,0,0,.12)' }}
      onMouseLeave={e => { if(onClick) e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,.06)' }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'3px' }}>
        <span style={{ fontSize:'9px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:c.text }}>{label}</span>
        {icon && <span style={{ fontSize:'13px', opacity:0.7 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:'17px', fontWeight:800, color:c.val, letterSpacing:'-0.02em', marginBottom:'1px', lineHeight:1.1 }}>
        {value}
      </div>
      {(sub !== undefined || subLabel) && (
        <div style={{ fontSize:'10px', color:c.text, opacity:0.8 }}>
          {sub !== undefined && <span style={{ fontWeight:600 }}>{sub}</span>}
          {subLabel && <span> {subLabel}</span>}
        </div>
      )}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom:'6px', paddingBottom:'4px', borderBottom:'2px solid #D8DDE6' }}>
      <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#54698D' }}>{title}</div>
      {subtitle && <div style={{ fontSize:'10px', color:'#8A99A8', marginTop:'1px' }}>{subtitle}</div>}
    </div>
  )
}

// ── Lista de atrasos ──────────────────────────────────────────────────────────
function AtrasoList({ items }) {
  if (items.length === 0) return <div style={{ fontSize:'11px', color:'#8A99A8', fontStyle:'italic', padding:'4px 0' }}>Nenhum em atraso ✓</div>
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'3px', marginTop:'5px' }}>
      {items.slice(0, 3).map((item, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'3px 7px', background:'#FFF', border:'1px solid #F5C8C8', borderRadius:'2px', fontSize:'10px' }}>
          <div style={{ minWidth:0, overflow:'hidden' }}>
            <div style={{ fontWeight:600, color:'#16191F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.nome}</div>
            <div style={{ color:'#8A99A8' }}>Venc. {formatDate(item.vencimento)}</div>
          </div>
          <div style={{ fontWeight:700, color:'#C62828', whiteSpace:'nowrap', marginLeft:'8px' }}>{formatCurrency(item.valor)}</div>
        </div>
      ))}
      {items.length > 3 && (
        <div style={{ fontSize:'10px', color:'#54698D', textAlign:'center', padding:'2px' }}>
          + {items.length - 3} contas a mais
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const hoje = todayStr()
  const [mes, setMes] = useState(currentMonthKey())
  const ano  = mes.substring(0, 4)

  const [contasReceber] = useLocalState('ts_contasReceber', [])
  const [contasPagar] = useLocalState('ts_contasPagar', [])
  const [ordens] = useLocalState('ts_ordens', [])
  const [pedidos] = useLocalState('ts_pedidos', [])
  const [clientes] = useLocalState('ts_clientes', [])
  const [fornecedores] = useLocalState('ts_fornecedores', [])
  // ── Financeiro ────────────────────────────────────────────────────────────
  // Contas a receber em atraso (usa vencimento — correto para atraso)
  const recAtrasadas = contasReceber.filter(c => c.status === 'aberto' && c.vencimento < hoje)
  const valorRecAtraso = recAtrasadas.reduce((s, c) => s + (c.valor || 0), 0)

  // Contas a pagar em atraso
  const pagAtrasadas   = contasPagar.filter(c => c.status === 'aberto' && c.vencimento < hoje)
  const valorPagAtraso = pagAtrasadas.reduce((s, c) => s + (c.valor || 0), 0)

  // Faturamento do mês — ordens com dataEntrega no mês selecionado
  const fatMes = ordens
    .filter(o => o.dataEntrega?.substring(0, 7) === mes)
    .reduce((s, o) => s + (parseFloat(o.valor) || 0), 0)

  // Faturamento acumulado — ordens com dataEntrega no ano até o mês selecionado (jan→mes)
  const fatAcumulado = ordens
    .filter(o => o.dataEntrega?.substring(0, 4) === ano && o.dataEntrega?.substring(0, 7) <= mes)
    .reduce((s, o) => s + (parseFloat(o.valor) || 0), 0)

  // A receber total em aberto
  const recAbertoTotal = contasReceber
    .filter(c => c.status === 'aberto')
    .reduce((s, c) => s + (c.valor || 0), 0)

  // A vencer (em aberto, vencimento >= hoje) — olhar pra frente
  const pagAVencer      = contasPagar.filter(c => c.status === 'aberto' && c.vencimento >= hoje)
  const valorPagAVencer = pagAVencer.reduce((s, c) => s + (c.valor || 0), 0)
  const recAVencer      = contasReceber.filter(c => c.status === 'aberto' && c.vencimento >= hoje)
  const valorRecAVencer = recAVencer.reduce((s, c) => s + (c.valor || 0), 0)

  // ── Operacional — Ordens ───────────────────────────────────────────────────
  const ordAguardando  = ordens.filter(o => o.status === 'aguardando')
  const ordExecucao    = ordens.filter(o => o.status === 'emExecucao')
  const ordProntas     = ordens.filter(o => o.status === 'pronto')
  const ordEntregues   = ordens.filter(o => o.status === 'entregue')

  const somaOS = (list) => list.reduce((s, o) => s + (o.valor || 0), 0)

  // ── Operacional — Pedidos ─────────────────────────────────────────────────
  const pedEnviados    = pedidos.filter(p => p.status === 'pedEnviado')
  const pedAprovados   = pedidos.filter(p => p.status === 'pedAprovado')
  const pedAguardando  = pedidos.filter(p => p.status === 'pedAguardando')
  const somaPed = (list) => list.reduce((s, p) => s + (p.total || 0), 0)

  // Lista de atrasos com nomes
  const recAtrasadasDetalhes = recAtrasadas.map(c => {
    const ordem = ordens.find(o => o.id === c.ordemId)
    const cli   = clientes.find(cl => cl.id === ordem?.clienteId)
    return { nome: cli?.nome || c.descricao, vencimento: c.vencimento, valor: c.valor }
  }).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))

  const pagAtrasadasDetalhes = pagAtrasadas.map(c => {
    const forn = fornecedores.find(f => f.id === c.fornecedorId)
    return { nome: forn?.nome || c.descricao, vencimento: c.vencimento, valor: c.valor }
  }).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))

  const mesLabel = monthLabel(mes)

  return (
    <div style={{ padding:'10px 16px' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:'8px' }}>
        <h1 className="erp-page-title" style={{ fontSize:'14px', margin:0 }}>Dashboard ⛵</h1>
        <span style={{ fontSize:'10px', color:'#8A99A8' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
        </span>
      </div>

      {/* ── FINANCEIRO ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', paddingBottom:'4px', borderBottom:'2px solid #D8DDE6' }}>
        <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#54698D' }}>Financeiro</div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'10px', color:'#54698D', fontWeight:600 }}>Período:</span>
          <MonthSelector value={mes} onChange={setMes} />
        </div>
      </div>

      {/* 3 colunas: Contas a Pagar | Contas a Receber | Faturamento */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'10px', alignItems:'start' }}>
        <div>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'5px' }}>Contas a Pagar</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            <KpiCard label="A Vencer" value={formatCurrency(valorPagAVencer)} sub={`${pagAVencer.length}`} subLabel="conta(s)" color="blue"   icon="📅" />
            <KpiCard label="Vencido"  value={formatCurrency(valorPagAtraso)}  sub={`${pagAtrasadas.length}`} subLabel="conta(s)" color="orange" icon="⚠" />
          </div>
        </div>
        <div>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'5px' }}>Contas a Receber</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            <KpiCard label="A Vencer" value={formatCurrency(valorRecAVencer)} sub={`${recAVencer.length}`} subLabel="conta(s)" color="blue" icon="📅" />
            <KpiCard label="Vencido"  value={formatCurrency(valorRecAtraso)}  sub={`${recAtrasadas.length}`} subLabel="conta(s)" color="red"  icon="⚠" />
          </div>
        </div>
        <div>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'5px' }}>Faturamento</div>
          <div style={{ background:'#EAF3FB', border:'1px solid #A8C8E8', borderRadius:'2px', padding:'8px 11px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              <div>
                <div style={{ fontSize:'9px', color:'#0050A0', fontWeight:600, marginBottom:'1px' }}>{mesLabel}</div>
                <div style={{ fontSize:'17px', fontWeight:800, color:'#0070D2', letterSpacing:'-0.02em', lineHeight:1.1 }}>{formatCurrency(fatMes)}</div>
                <div style={{ fontSize:'9px', color:'#0050A0', opacity:0.8, marginTop:'2px' }}>{formatCurrency(recAbertoTotal)} a receber</div>
              </div>
              <div style={{ borderLeft:'1px solid #A8C8E8', paddingLeft:'10px' }}>
                <div style={{ fontSize:'9px', color:'#0050A0', fontWeight:600, marginBottom:'1px' }}>Jan–{mesLabel}</div>
                <div style={{ fontSize:'17px', fontWeight:800, color:'#0070D2', letterSpacing:'-0.02em', lineHeight:1.1 }}>{formatCurrency(fatAcumulado)}</div>
                <div style={{ fontSize:'9px', color:'#0050A0', opacity:0.8, marginTop:'2px' }}>acumulado {ano}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Listas de atraso */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
        <div className="erp-panel" style={{ padding:'9px 11px' }}>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#C62828', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            ⚠ Contas a Receber Vencidas ({recAtrasadas.length})
          </div>
          <AtrasoList items={recAtrasadasDetalhes} />
        </div>
        <div className="erp-panel" style={{ padding:'9px 11px' }}>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#E65100', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            ⚠ Contas a Pagar Vencidas ({pagAtrasadas.length})
          </div>
          <AtrasoList items={pagAtrasadasDetalhes} />
        </div>
      </div>

      {/* ── OPERACIONAL — ORDENS ── */}
      <SectionHeader title="Operacional — Ordens de Serviço" />
      <div style={{ marginBottom:'12px' }}>
        <ChevronKPI
          ariaLabel="Pipeline de status das Ordens de Serviço"
          stages={[
            { label:'Aguardando',        icon:'⏳', count:ordAguardando.length, valor:somaOS(ordAguardando), color:'orange' },
            { label:'Em Execução',       icon:'🔧', count:ordExecucao.length,   valor:somaOS(ordExecucao),   color:'blue'   },
            { label:'Pronta p/ Entrega', icon:'✅', count:ordProntas.length,    valor:somaOS(ordProntas),    color:'green'  },
            { label:'Entregues',         icon:'📦', count:ordEntregues.length,  valor:somaOS(ordEntregues),  color:'gray'   },
          ]}
        />
      </div>

      {/* ── OPERACIONAL — PEDIDOS ── */}
      <SectionHeader title="Operacional — Pedidos (Orçamentos)" />
      <div>
        <ChevronKPI
          ariaLabel="Pipeline de status dos Pedidos"
          stages={[
            { label:'Em Elaboração',       icon:'📝', count:pedAguardando.length, valor:somaPed(pedAguardando), color:'orange' },
            { label:'Enviado ao Cliente',  icon:'📤', count:pedEnviados.length,   valor:somaPed(pedEnviados),   color:'blue'   },
            { label:'Aprovado',            icon:'✔',  count:pedAprovados.length,  valor:somaPed(pedAprovados),  color:'green'  },
          ]}
        />
      </div>
    </div>
  )
}
