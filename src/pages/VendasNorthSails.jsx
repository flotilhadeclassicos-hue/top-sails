import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, getMonthKey, monthLabel } from '../utils/helpers'
import Modal from '../components/ui/Modal'

// Cores de status espelhando o mapa de situação do Tiny (La Brújula)
const STATUS_COR = {
  'Em aberto':        { bg:'#F4F6F8', fg:'#54698D' },
  'Faturado':         { bg:'#EAF3FB', fg:'#0050A0' },
  'Cancelado':        { bg:'#FDECEA', fg:'#C62828' },
  'Aprovado':         { bg:'#E7F5EC', fg:'#1B7F3B' },
  'Preparando envio': { bg:'#FEF6E6', fg:'#A66B00' },
  'Enviado':          { bg:'#F1ECFB', fg:'#5B3F9E' },
  'Entregue':         { bg:'#E6F5F3', fg:'#0F766E' },
  'Pronto p/ envio':  { bg:'#E6F6FA', fg:'#0E7490' },
}

function StatusBadge({ label }) {
  const c = STATUS_COR[label] || { bg:'#F4F6F8', fg:'#54698D' }
  return (
    <span style={{ background:c.bg, color:c.fg, fontSize:'11px', fontWeight:600,
      padding:'2px 8px', borderRadius:'10px', whiteSpace:'nowrap' }}>{label}</span>
  )
}

// ── Modal de detalhe da venda ───────────────────────────────────────────────
const LABEL = { fontSize:'10px', fontWeight:700, color:'#7F8C9A', textTransform:'uppercase', letterSpacing:'0.04em' }
const VAL   = { fontSize:'12px', color:'#16191F' }
const SEC   = { fontSize:'11px', fontWeight:700, color:'#0050A0', textTransform:'uppercase', letterSpacing:'0.05em', margin:'18px 0 8px', borderBottom:'1px solid #E4E7EA', paddingBottom:'4px' }

function Campo({ label, children }) {
  if (children == null || children === '' ) return null
  return (
    <div>
      <div style={LABEL}>{label}</div>
      <div style={VAL}>{children}</div>
    </div>
  )
}

function Grid({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'10px 16px' }}>{children}</div>
}

function VendaDetalheModal({ venda, onClose }) {
  const v = venda
  const end = v.cliente?.endereco
  const endStr = end
    ? [end.logradouro, end.numero, end.bairro, end.municipio && `${end.municipio}${end.uf ? '/' + end.uf : ''}`, end.cep]
        .filter(Boolean).join(', ')
    : null

  return (
    <Modal title={`Pedido ${v.numeroPedido} — ${v.cliente?.nome || ''}`} onClose={onClose} size="xl">
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
        <StatusBadge label={v.situacaoLabel} />
        <span style={{ fontSize:'13px', fontWeight:700, color:'#16191F' }}>{formatCurrency(v.valor || 0)}</span>
        <span style={{ fontSize:'11px', color:'#7F8C9A' }}>{v.vendedorNome}</span>
      </div>

      <div style={SEC}>Pedido</div>
      <Grid>
        <Campo label="Nº Pedido">{v.numeroPedido}</Campo>
        <Campo label="Data">{formatDate(v.data)}</Campo>
        <Campo label="Status">{v.situacaoLabel}</Campo>
        <Campo label="Nota Fiscal">{v.idNotaFiscal}</Campo>
        <Campo label="OC (cliente)">{v.numeroOrdemCompra}</Campo>
        <Campo label="Depósito">{v.depositoNome}</Campo>
        <Campo label="Natureza Operação">{v.naturezaOperacao}</Campo>
        <Campo label="Prevista">{v.dataPrevista && formatDate(v.dataPrevista)}</Campo>
        <Campo label="Envio">{v.dataEnvio && formatDate(String(v.dataEnvio).slice(0,10))}</Campo>
        <Campo label="Entrega">{v.dataEntrega && formatDate(v.dataEntrega)}</Campo>
        <Campo label="Faturamento">{v.dataFaturamento && formatDate(v.dataFaturamento)}</Campo>
      </Grid>

      <div style={SEC}>Cliente</div>
      <Grid>
        <Campo label="Nome">{v.cliente?.nome}</Campo>
        <Campo label="Fantasia">{v.cliente?.fantasia}</Campo>
        <Campo label="CPF/CNPJ">{v.cliente?.cpfCnpj}</Campo>
        <Campo label="Telefone">{v.cliente?.telefone}</Campo>
        <Campo label="E-mail">{v.cliente?.email}</Campo>
      </Grid>
      {endStr && <div style={{ marginTop:'10px' }}><Campo label="Endereço">{endStr}</Campo></div>}

      {v.itens?.length > 0 && (
        <>
          <div style={SEC}>Itens ({v.itens.length})</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
            <thead>
              <tr style={{ background:'#F4F6F8', textAlign:'left', color:'#54698D' }}>
                <th style={{ padding:'6px 8px', fontWeight:600 }}>Produto</th>
                <th style={{ padding:'6px 8px', fontWeight:600, textAlign:'right' }}>Qtd</th>
                <th style={{ padding:'6px 8px', fontWeight:600, textAlign:'right' }}>Unitário</th>
                <th style={{ padding:'6px 8px', fontWeight:600, textAlign:'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {v.itens.map((it, i) => (
                <tr key={i} style={{ borderTop:'1px solid #EDF0F2' }}>
                  <td style={{ padding:'6px 8px', color:'#16191F' }}>{it.descricao || '—'}{it.sku ? <span style={{ color:'#7F8C9A' }}> · {it.sku}</span> : null}</td>
                  <td style={{ padding:'6px 8px', textAlign:'right' }}>{it.quantidade}</td>
                  <td style={{ padding:'6px 8px', textAlign:'right' }}>{formatCurrency(it.valorUnitario || 0)}</td>
                  <td style={{ padding:'6px 8px', textAlign:'right' }}>{formatCurrency((it.valorUnitario || 0) * (it.quantidade || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div style={SEC}>Valores</div>
      <Grid>
        <Campo label="Produtos">{formatCurrency(v.valorProdutos || 0)}</Campo>
        <Campo label="Desconto">{formatCurrency(v.valorDesconto || 0)}</Campo>
        <Campo label="Frete">{formatCurrency(v.valorFrete || 0)}</Campo>
        <Campo label="Outras despesas">{formatCurrency(v.valorOutrasDespesas || 0)}</Campo>
        <Campo label="Total">{formatCurrency(v.valor || 0)}</Campo>
      </Grid>

      {(v.formaPagamento || v.condicaoPagamento || v.parcelas?.length > 0) && (
        <>
          <div style={SEC}>Pagamento</div>
          <Grid>
            <Campo label="Forma">{v.formaPagamento}</Campo>
            <Campo label="Condição">{v.condicaoPagamento}</Campo>
          </Grid>
          {v.parcelas?.length > 0 && (
            <div style={{ marginTop:'10px', display:'flex', flexDirection:'column', gap:'4px' }}>
              {v.parcelas.map((pc, i) => (
                <div key={i} style={{ display:'flex', gap:'12px', fontSize:'12px', color:'#16191F' }}>
                  <span style={{ color:'#7F8C9A', minWidth:'90px' }}>{pc.data && formatDate(String(pc.data).slice(0,10))}</span>
                  <span style={{ minWidth:'90px' }}>{formatCurrency(pc.valor || 0)}</span>
                  <span style={{ color:'#54698D' }}>{pc.forma}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {v.transportador && (v.transportador.nome || v.transportador.codigoRastreamento) && (
        <>
          <div style={SEC}>Transporte</div>
          <Grid>
            <Campo label="Transportadora">{v.transportador.nome}</Campo>
            <Campo label="Forma de envio">{v.transportador.formaEnvio}</Campo>
            <Campo label="Rastreamento">{v.transportador.codigoRastreamento}</Campo>
          </Grid>
        </>
      )}

      {(v.observacoes || v.observacoesInternas || v.marcadores?.length > 0) && (
        <>
          <div style={SEC}>Observações</div>
          {v.marcadores?.length > 0 && (
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'8px' }}>
              {v.marcadores.map((m, i) => (
                <span key={i} style={{ background:'#EAF3FB', color:'#0050A0', fontSize:'11px', padding:'2px 8px', borderRadius:'10px' }}>{m}</span>
              ))}
            </div>
          )}
          {v.observacoes && <div style={{ ...VAL, whiteSpace:'pre-wrap', marginBottom:'8px' }}><div style={LABEL}>Observações</div>{v.observacoes}</div>}
          {v.observacoesInternas && <div style={{ ...VAL, whiteSpace:'pre-wrap', color:'#54698D' }}><div style={LABEL}>Internas</div>{v.observacoesInternas}</div>}
        </>
      )}
    </Modal>
  )
}

export default function VendasNorthSails() {
  // Vendas importadas da La Brújula (upsert por tinyId)
  const [vendas, setVendas] = useLocalState('ts_vendasNS', [])
  const [meta, setMeta]     = useLocalState('ts_vendasNS_meta', {})

  const [sincronizando, setSincronizando] = useState(false)
  const [msg, setMsg]   = useState('')
  const [erro, setErro] = useState('')

  const [detalhe, setDetalhe]     = useState(null)
  const [fMes, setFMes]           = useState('')
  const [fVendedor, setFVendedor] = useState('')
  const [fStatus, setFStatus]     = useState('')
  const [busca, setBusca]         = useState('')

  const sincronizar = async () => {
    setSincronizando(true); setMsg(''); setErro('')
    try {
      const { data, error } = await supabase.functions.invoke('import-vendas-ns', { body: {} })
      if (error) throw new Error(error.message)
      if (!data?.ok) throw new Error(data?.error || 'Falha na importação.')

      const recebidas = data.vendas || []
      // Upsert por tinyId: atualiza existentes, adiciona novas
      const mapa = new Map(vendas.map(v => [v.tinyId, v]))
      let novas = 0, atualizadas = 0
      for (const v of recebidas) {
        if (mapa.has(v.tinyId)) atualizadas++; else novas++
        mapa.set(v.tinyId, v)
      }
      const merged = [...mapa.values()]
      await setVendas(merged)
      await setMeta({ ultimaSync: new Date().toISOString(), total: merged.length, vendedores: data.vendedores || [] })
      setMsg(`Sincronizado: ${recebidas.length} vendas (${novas} novas, ${atualizadas} atualizadas).`)
    } catch (e) {
      setErro(e.message || 'Erro ao sincronizar.')
    } finally {
      setSincronizando(false)
    }
  }

  const vendedores = useMemo(
    () => [...new Set(vendas.map(v => v.vendedorNome).filter(Boolean))].sort(),
    [vendas]
  )
  const statuses = useMemo(
    () => [...new Set(vendas.map(v => v.situacaoLabel).filter(Boolean))].sort(),
    [vendas]
  )
  const meses = useMemo(
    () => [...new Set(vendas.map(v => getMonthKey(v.data)).filter(Boolean))].sort().reverse(),
    [vendas]
  )

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return vendas
      .filter(v => !fMes      || getMonthKey(v.data) === fMes)
      .filter(v => !fVendedor || v.vendedorNome === fVendedor)
      .filter(v => !fStatus   || v.situacaoLabel === fStatus)
      .filter(v => !b
        || String(v.numeroPedido).includes(b)
        || (v.cliente?.nome || '').toLowerCase().includes(b)
        || (v.numeroOrdemCompra || '').toLowerCase().includes(b))
      .sort((a, z) => String(z.data || '').localeCompare(String(a.data || '')) || z.numeroPedido - a.numeroPedido)
  }, [vendas, fMes, fVendedor, fStatus, busca])

  const totalValor = filtradas.reduce((s, v) => s + (v.valor || 0), 0)

  const selStyle = { fontSize:'12px', padding:'5px 8px', border:'1px solid #D8DDE6', borderRadius:'4px', background:'#fff', color:'#16191F', fontFamily:'inherit' }

  return (
    <div style={{ padding:'20px 24px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px', flexWrap:'wrap', gap:'10px' }}>
        <div>
          <h1 style={{ fontSize:'18px', fontWeight:700, color:'#16191F', margin:0 }}>Vendas North Sails</h1>
          <p style={{ fontSize:'12px', color:'#54698D', margin:'2px 0 0' }}>
            Vendas importadas da La Brújula (vendedores Top Sail e Daniel Seixas)
          </p>
        </div>
        <button
          onClick={sincronizar}
          disabled={sincronizando}
          style={{ fontSize:'12px', fontWeight:600, color:'#fff', background: sincronizando ? '#7FA9D6' : '#0070D2',
            border:'none', borderRadius:'4px', padding:'8px 16px', cursor: sincronizando ? 'default' : 'pointer', fontFamily:'inherit' }}
        >
          {sincronizando ? 'Sincronizando…' : '↻ Sincronizar'}
        </button>
      </div>

      {meta?.ultimaSync && (
        <div style={{ fontSize:'11px', color:'#7F8C9A', marginBottom:'14px' }}>
          Última sincronização: {new Date(meta.ultimaSync).toLocaleString('pt-BR')} · {vendas.length} vendas no total
        </div>
      )}

      {msg  && <div style={{ background:'#E7F5EC', color:'#1B7F3B', fontSize:'12px', padding:'8px 12px', borderRadius:'4px', marginBottom:'12px' }}>{msg}</div>}
      {erro && <div style={{ background:'#FDECEA', color:'#C62828', fontSize:'12px', padding:'8px 12px', borderRadius:'4px', marginBottom:'12px' }}>{erro}</div>}

      {/* Filtros */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px' }}>
        <input placeholder="Buscar nº pedido, cliente ou OC…" value={busca} onChange={e => setBusca(e.target.value)}
          style={{ ...selStyle, flex:'1 1 240px', minWidth:'200px' }} />
        <select value={fMes} onChange={e => setFMes(e.target.value)} style={selStyle}>
          <option value="">Todos os meses</option>
          {meses.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <select value={fVendedor} onChange={e => setFVendedor(e.target.value)} style={selStyle}>
          <option value="">Todos os vendedores</option>
          {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={selStyle}>
          <option value="">Todos os status</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Resumo */}
      <div style={{ display:'flex', gap:'16px', marginBottom:'12px', fontSize:'12px', color:'#54698D' }}>
        <span><strong style={{ color:'#16191F' }}>{filtradas.length}</strong> vendas</span>
        <span>Total: <strong style={{ color:'#16191F' }}>{formatCurrency(totalValor)}</strong></span>
      </div>

      {/* Tabela */}
      {vendas.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px', color:'#7F8C9A', fontSize:'13px', background:'#F8FAFC', borderRadius:'8px', border:'1px dashed #D8DDE6' }}>
          Nenhuma venda importada ainda. Clique em <strong>Sincronizar</strong> para buscar as vendas na La Brújula.
        </div>
      ) : (
        <div style={{ overflowX:'auto', border:'1px solid #E4E7EA', borderRadius:'8px' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
            <thead>
              <tr style={{ background:'#F4F6F8', textAlign:'left', color:'#54698D' }}>
                <th style={{ padding:'8px 10px', fontWeight:600 }}>Data</th>
                <th style={{ padding:'8px 10px', fontWeight:600 }}>Nº Pedido</th>
                <th style={{ padding:'8px 10px', fontWeight:600 }}>Cliente</th>
                <th style={{ padding:'8px 10px', fontWeight:600 }}>Itens</th>
                <th style={{ padding:'8px 10px', fontWeight:600 }}>Vendedor</th>
                <th style={{ padding:'8px 10px', fontWeight:600 }}>OC</th>
                <th style={{ padding:'8px 10px', fontWeight:600, textAlign:'right' }}>Valor</th>
                <th style={{ padding:'8px 10px', fontWeight:600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(v => (
                <tr key={v.tinyId} onClick={() => setDetalhe(v)}
                  style={{ borderTop:'1px solid #EDF0F2', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'8px 10px', color:'#16191F', whiteSpace:'nowrap' }}>{formatDate(v.data)}</td>
                  <td style={{ padding:'8px 10px', color:'#16191F', fontWeight:600 }}>{v.numeroPedido}</td>
                  <td style={{ padding:'8px 10px', color:'#16191F' }}>{v.cliente?.nome || '—'}</td>
                  <td style={{ padding:'8px 10px', color:'#54698D', maxWidth:'280px' }}>
                    {v.itens?.length > 0 ? (
                      <span title={v.itens.map(it => `${it.quantidade}× ${it.descricao}`).join('\n')}>
                        <span style={{ display:'inline-block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'230px', verticalAlign:'bottom' }}>
                          {v.itens[0].descricao || '—'}
                        </span>
                        {v.itens.length > 1 && <span style={{ color:'#0070D2', fontWeight:600 }}> +{v.itens.length - 1}</span>}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding:'8px 10px', color:'#54698D' }}>{v.vendedorNome || '—'}</td>
                  <td style={{ padding:'8px 10px', color:'#7F8C9A', fontFamily:'monospace', fontSize:'11px' }}>{v.numeroOrdemCompra || '—'}</td>
                  <td style={{ padding:'8px 10px', color:'#16191F', textAlign:'right', whiteSpace:'nowrap' }}>{formatCurrency(v.valor || 0)}</td>
                  <td style={{ padding:'8px 10px' }}><StatusBadge label={v.situacaoLabel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalhe && <VendaDetalheModal venda={detalhe} onClose={() => setDetalhe(null)} />}
    </div>
  )
}
