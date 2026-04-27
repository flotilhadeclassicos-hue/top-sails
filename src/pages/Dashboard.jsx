import { useState, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { formatCurrency, formatDate, currentMonthKey, monthLabel } from '../utils/helpers'

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
        padding:'14px 16px', cursor: onClick ? 'pointer' : 'default',
        transition:'box-shadow .15s', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}
      onMouseEnter={e => { if(onClick) e.currentTarget.style.boxShadow='0 3px 8px rgba(0,0,0,.12)' }}
      onMouseLeave={e => { if(onClick) e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,.06)' }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
        <span style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:c.text }}>{label}</span>
        {icon && <span style={{ fontSize:'16px', opacity:0.7 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:'22px', fontWeight:800, color:c.val, letterSpacing:'-0.02em', marginBottom:'4px' }}>
        {value}
      </div>
      {(sub !== undefined || subLabel) && (
        <div style={{ fontSize:'11px', color:c.text, opacity:0.8 }}>
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
    <div style={{ marginBottom:'12px', paddingBottom:'8px', borderBottom:'2px solid #D8DDE6' }}>
      <div style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#54698D' }}>{title}</div>
      {subtitle && <div style={{ fontSize:'11px', color:'#8A99A8', marginTop:'2px' }}>{subtitle}</div>}
    </div>
  )
}

// ── Lista de atrasos ──────────────────────────────────────────────────────────
function AtrasoList({ items, tipo }) {
  if (items.length === 0) return <div style={{ fontSize:'12px', color:'#8A99A8', fontStyle:'italic', padding:'8px 0' }}>Nenhum em atraso ✓</div>
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'4px', marginTop:'8px' }}>
      {items.slice(0, 5).map((item, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'5px 8px', background:'#FFF', border:'1px solid #F5C8C8', borderRadius:'2px', fontSize:'11px' }}>
          <div>
            <div style={{ fontWeight:600, color:'#16191F' }}>{item.nome}</div>
            <div style={{ color:'#8A99A8' }}>Venc. {formatDate(item.vencimento)}</div>
          </div>
          <div style={{ fontWeight:700, color:'#C62828' }}>{formatCurrency(item.valor)}</div>
        </div>
      ))}
      {items.length > 5 && (
        <div style={{ fontSize:'11px', color:'#54698D', textAlign:'center', padding:'4px' }}>
          + {items.length - 5} {tipo === 'receber' ? 'contas' : 'contas'} a mais
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
  const [financeiro] = useLocalState('ts_financeiro', [])
  const [caixinha] = useLocalState('ts_caixinha', [])
  const [offBook] = useLocalState('ts_offBook', [])

  // ── Receitas consolidadas de todas as fontes ──────────────────────────────
  // Bancos (ts_financeiro) + Caixinha (ts_caixinha) + Off Book sem parteId (ts_offBook)
  // Todos os lançamentos com tipo='receita', independente da origem
  const todasReceitas = [
    ...financeiro.map(i => ({ ...i, _fonte:'financeiro' })),
    ...caixinha.map(i => ({ ...i, _fonte:'caixinha' })),
    ...offBook.filter(i => !i.parteId).map(i => ({ ...i, _fonte:'offbook' })),
  ].filter(i => i.tipo === 'receita')

  // ── Financeiro ────────────────────────────────────────────────────────────
  // Contas a receber em atraso (usa vencimento — correto para atraso)
  const recAtrasadas = contasReceber.filter(c => c.status === 'aberto' && c.vencimento < hoje)
  const clientesAtrasadosIds = new Set(
    recAtrasadas.map(c => ordens.find(o => o.id === c.ordemId)?.clienteId).filter(Boolean)
  )
  const valorRecAtraso = recAtrasadas.reduce((s, c) => s + (c.valor || 0), 0)

  // Contas a pagar em atraso
  const pagAtrasadas   = contasPagar.filter(c => c.status === 'aberto' && c.vencimento < hoje)
  const valorPagAtraso = pagAtrasadas.reduce((s, c) => s + (c.valor || 0), 0)

  // Faturamento do mês — soma todas as receitas registradas no mês selecionado
  const fatMes = todasReceitas
    .filter(i => i.data?.substring(0, 7) === mes)
    .reduce((s, i) => s + (parseFloat(i.valor) || 0), 0)

  // Faturamento acumulado — receitas do ano até o mês selecionado (jan→mes)
  const fatAcumulado = todasReceitas
    .filter(i => i.data?.substring(0, 4) === ano && i.data?.substring(0, 7) <= mes)
    .reduce((s, i) => s + (parseFloat(i.valor) || 0), 0)

  // A receber total em aberto
  const recAbertoTotal = contasReceber
    .filter(c => c.status === 'aberto')
    .reduce((s, c) => s + (c.valor || 0), 0)

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
  }).sort((a, b) => a.vencimento?.localeCompare(b.vencimento))

  const pagAtrasadasDetalhes = pagAtrasadas.map(c => {
    const forn = fornecedores.find(f => f.id === c.fornecedorId)
    return { nome: forn?.nome || c.descricao, vencimento: c.vencimento, valor: c.valor }
  }).sort((a, b) => a.vencimento?.localeCompare(b.vencimento))

  const mesLabel = monthLabel(mes)

  return (
    <div style={{ padding:'20px 24px' }}>
      <nav className="erp-bc">
        <span>Top Sails</span><span className="sep">/</span><span className="cur">Dashboard</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">Dashboard</h1>
        <span style={{ fontSize:'11px', color:'#8A99A8' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
        </span>
      </div>

      {/* ── FINANCEIRO ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px', paddingBottom:'8px', borderBottom:'2px solid #D8DDE6' }}>
        <div>
          <div style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#54698D' }}>Financeiro</div>
          <div style={{ fontSize:'11px', color:'#8A99A8', marginTop:'2px' }}>Faturamento baseado em recebimentos realizados</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'11px', color:'#54698D', fontWeight:600 }}>Período:</span>
          <MonthSelector value={mes} onChange={setMes} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'24px' }}>
        <KpiCard
          label="Clientes em Atraso"
          value={clientesAtrasadosIds.size}
          sub={formatCurrency(valorRecAtraso)}
          subLabel="em aberto vencido"
          color="red"
          icon="⚠"
        />
        <KpiCard
          label="Contas a Pagar em Atraso"
          value={pagAtrasadas.length}
          sub={formatCurrency(valorPagAtraso)}
          subLabel="em aberto vencido"
          color="orange"
          icon="⚠"
        />
        <KpiCard
          label={`Faturamento — ${mesLabel}`}
          value={formatCurrency(fatMes)}
          sub={formatCurrency(recAbertoTotal)}
          subLabel="a receber em aberto"
          color="blue"
          icon="📅"
        />
        <KpiCard
          label={`Acumulado Jan–${mesLabel}`}
          value={formatCurrency(fatAcumulado)}
          sub={`${ano}`}
          subLabel="ano corrente"
          color="green"
          icon="📈"
        />
      </div>

      {/* Listas de atraso */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'28px' }}>
        <div className="erp-panel" style={{ padding:'14px 16px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#C62828', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' }}>
            ⚠ Contas a Receber Vencidas ({recAtrasadas.length})
          </div>
          <AtrasoList items={recAtrasadasDetalhes} tipo="receber" />
        </div>
        <div className="erp-panel" style={{ padding:'14px 16px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#E65100', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' }}>
            ⚠ Contas a Pagar Vencidas ({pagAtrasadas.length})
          </div>
          <AtrasoList items={pagAtrasadasDetalhes} tipo="pagar" />
        </div>
      </div>

      {/* ── OPERACIONAL — ORDENS ── */}
      <SectionHeader title="Operacional — Ordens de Serviço" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'24px' }}>
        <KpiCard
          label="Aguardando"
          value={ordAguardando.length}
          sub={formatCurrency(somaOS(ordAguardando))}
          subLabel="em carteira"
          color="orange"
          icon="⏳"
        />
        <KpiCard
          label="Em Execução"
          value={ordExecucao.length}
          sub={formatCurrency(somaOS(ordExecucao))}
          subLabel="em andamento"
          color="blue"
          icon="🔧"
        />
        <KpiCard
          label="Prontas para Entrega"
          value={ordProntas.length}
          sub={formatCurrency(somaOS(ordProntas))}
          subLabel="aguardando retirada"
          color="green"
          icon="✅"
        />
        <KpiCard
          label="Entregues"
          value={ordEntregues.length}
          sub={formatCurrency(somaOS(ordEntregues))}
          subLabel="concluídas"
          color="gray"
          icon="📦"
        />
      </div>

      {/* ── OPERACIONAL — PEDIDOS ── */}
      <SectionHeader title="Operacional — Pedidos (Orçamentos)" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px' }}>
        <KpiCard
          label="Enviados ao Cliente"
          value={pedEnviados.length}
          sub={formatCurrency(somaPed(pedEnviados))}
          subLabel="aguardando aprovação"
          color="blue"
          icon="📤"
        />
        <KpiCard
          label="Aprovados"
          value={pedAprovados.length}
          sub={formatCurrency(somaPed(pedAprovados))}
          subLabel="com OS gerada"
          color="green"
          icon="✔"
        />
        <KpiCard
          label="Em Elaboração"
          value={pedAguardando.length}
          sub={formatCurrency(somaPed(pedAguardando))}
          subLabel="aguardando envio"
          color="orange"
          icon="📝"
        />
      </div>
    </div>
  )
}
