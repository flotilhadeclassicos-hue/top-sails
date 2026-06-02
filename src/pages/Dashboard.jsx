import { useState } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { formatCurrencyInt as formatCurrency, formatCurrency as fmtFull, formatDate, addDays } from '../utils/helpers'
import ChevronKPI from '../components/ui/ChevronKPI'
import Modal from '../components/ui/Modal'

const todayStr = () => new Date().toISOString().split('T')[0]

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
function AtrasoList({ items, emptyMsg, onSelect }) {
  if (items.length === 0) return <div style={{ fontSize:'11px', color:'#8A99A8', fontStyle:'italic', padding:'4px 0' }}>{emptyMsg || 'Nenhum em atraso ✓'}</div>
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'3px', marginTop:'5px', maxHeight:'150px', overflowY:'auto', paddingRight:'2px' }}>
      {items.map((item, i) => {
        const overdue = item.atrasado
        return (
          <div key={i} onClick={() => onSelect?.(item)}
            style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer',
              padding:'3px 7px', background:'#FFF', border:`1px solid ${overdue ? '#F5C8C8' : '#D8DDE6'}`, borderRadius:'2px', fontSize:'10px' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F4F6F8'}
            onMouseLeave={e => e.currentTarget.style.background = '#FFF'}>
            <div style={{ minWidth:0, overflow:'hidden' }}>
              <div style={{ fontWeight:600, color:'#16191F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.nome}</div>
              <div style={{ color: overdue ? '#C62828' : '#8A99A8' }}>
                {overdue ? 'Vencido ' : 'Vence '}{formatDate(item.vencimento)}
              </div>
            </div>
            <div style={{ fontWeight:700, color: overdue ? '#C62828' : '#16191F', whiteSpace:'nowrap', marginLeft:'8px' }}>{formatCurrency(item.valor)}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Modal de detalhe do lançamento (conta a receber/pagar) ────────────────────
function LancamentoModal({ item, categorias, onClose }) {
  const c = item.conta
  const cat = categorias.find(x => x.id === c.categoriaId)
  const tipoLabel = item.tipo === 'receber' ? 'Conta a Receber' : 'Conta a Pagar'
  const statusLabel = c.status === 'confirmado' ? (item.tipo === 'receber' ? 'Recebido' : 'Pago') : 'Em aberto'
  const L = { fontSize:'10px', fontWeight:700, color:'#7F8C9A', textTransform:'uppercase', letterSpacing:'0.04em' }
  const V = { fontSize:'13px', color:'#16191F', marginBottom:'10px' }
  return (
    <Modal title={`${tipoLabel} — ${item.nome}`} onClose={onClose} size="sm">
      <div style={{ display:'flex', alignItems:'baseline', gap:'10px', marginBottom:'12px' }}>
        <span style={{ fontSize:'22px', fontWeight:800, color: item.tipo==='receber' ? '#2E7D32' : '#C62828' }}>{fmtFull(c.valor)}</span>
        <span style={{ fontSize:'11px', fontWeight:600, color: item.atrasado ? '#C62828' : '#54698D' }}>
          {item.atrasado ? 'Vencido' : 'A vencer'} · {statusLabel}
        </span>
      </div>
      <div style={L}>Descrição</div><div style={V}>{c.descricao || '—'}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <div><div style={L}>Vencimento</div><div style={V}>{formatDate(c.vencimento)}</div></div>
        <div><div style={L}>Categoria</div><div style={V}>{cat?.nome || '—'}</div></div>
        <div><div style={L}>{item.tipo === 'receber' ? 'Cliente' : 'Fornecedor'}</div><div style={V}>{item.nome}</div></div>
        <div><div style={L}>Forma</div><div style={V}>{c.formaPagamento || '—'}</div></div>
      </div>
    </Modal>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const hoje = todayStr()

  const [contasReceber] = useLocalState('ts_contasReceber', [])
  const [contasPagar] = useLocalState('ts_contasPagar', [])
  const [ordens] = useLocalState('ts_ordens', [])
  const [pedidos] = useLocalState('ts_pedidos', [])
  const [clientes] = useLocalState('ts_clientes', [])
  const [fornecedores] = useLocalState('ts_fornecedores', [])
  const [categorias] = useLocalState('ts_categorias', [])
  const [lancamento, setLancamento] = useState(null)
  // ── Financeiro ────────────────────────────────────────────────────────────
  // Contas a receber em atraso (usa vencimento — correto para atraso)
  const recAtrasadas = contasReceber.filter(c => c.status === 'aberto' && c.vencimento < hoje)
  const valorRecAtraso = recAtrasadas.reduce((s, c) => s + (c.valor || 0), 0)

  // Contas a pagar em atraso
  const pagAtrasadas   = contasPagar.filter(c => c.status === 'aberto' && c.vencimento < hoje)
  const valorPagAtraso = pagAtrasadas.reduce((s, c) => s + (c.valor || 0), 0)

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

  // Contas a receber vencidas — todas, com detalhe p/ modal
  const recAtrasadasDetalhes = recAtrasadas.map(c => {
    const ordem = ordens.find(o => o.id === c.ordemId)
    const cli   = clientes.find(cl => cl.id === ordem?.clienteId)
    return { conta:c, tipo:'receber', atrasado:true, nome: cli?.nome || c.clienteNome || c.descricao, vencimento: c.vencimento, valor: c.valor }
  }).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))

  // Contas a pagar — atrasadas + a vencer nos próximos 15 dias
  const limite15 = addDays(hoje, 15)
  const pagProximas = contasPagar.filter(c => c.status === 'aberto' && c.vencimento && c.vencimento <= limite15)
  const pagProximasDetalhes = pagProximas.map(c => {
    const forn = fornecedores.find(f => f.id === c.fornecedorId)
    return { conta:c, tipo:'pagar', atrasado: c.vencimento < hoje, nome: forn?.nome || c.descricao, vencimento: c.vencimento, valor: c.valor }
  }).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))

  return (
    <div style={{ padding:'10px 16px' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:'8px' }}>
        <h1 className="erp-page-title" style={{ fontSize:'14px', margin:0 }}>Dashboard ⛵</h1>
        <span style={{ fontSize:'10px', color:'#8A99A8' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
        </span>
      </div>

      {/* ── FINANCEIRO ── */}
      <div style={{ marginBottom:'8px', paddingBottom:'4px', borderBottom:'2px solid #D8DDE6' }}>
        <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#54698D' }}>Financeiro</div>
      </div>

      {/* 2 colunas: Contas a Receber | Contas a Pagar (alinha com as listas abaixo) */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'10px', alignItems:'start' }}>
        <div>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'5px' }}>Contas a Receber</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            <KpiCard label="A Vencer" value={formatCurrency(valorRecAVencer)} sub={`${recAVencer.length}`} subLabel="conta(s)" color="blue" icon="📅" />
            <KpiCard label="Vencido"  value={formatCurrency(valorRecAtraso)}  sub={`${recAtrasadas.length}`} subLabel="conta(s)" color="red"  icon="⚠" />
          </div>
        </div>
        <div>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'5px' }}>Contas a Pagar</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            <KpiCard label="A Vencer" value={formatCurrency(valorPagAVencer)} sub={`${pagAVencer.length}`} subLabel="conta(s)" color="blue"   icon="📅" />
            <KpiCard label="Vencido"  value={formatCurrency(valorPagAtraso)}  sub={`${pagAtrasadas.length}`} subLabel="conta(s)" color="orange" icon="⚠" />
          </div>
        </div>
      </div>

      {/* Listas: Receber vencidas | Pagar (atraso + próximos 15 dias) */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
        <div className="erp-panel" style={{ padding:'9px 11px' }}>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#C62828', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            ⚠ Contas a Receber Vencidas ({recAtrasadasDetalhes.length})
          </div>
          <AtrasoList items={recAtrasadasDetalhes} emptyMsg="Nenhuma vencida ✓" onSelect={setLancamento} />
        </div>
        <div className="erp-panel" style={{ padding:'9px 11px' }}>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#E65100', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            ⚠ Contas a Pagar — Atraso + Próx. 15 dias ({pagProximasDetalhes.length})
          </div>
          <AtrasoList items={pagProximasDetalhes} emptyMsg="Nada a pagar nos próximos 15 dias ✓" onSelect={setLancamento} />
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

      {lancamento && <LancamentoModal item={lancamento} categorias={categorias} onClose={() => setLancamento(null)} />}
    </div>
  )
}
