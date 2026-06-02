import { useState } from 'react'
import { useLocalState, readLocal, writeLocal } from '../../hooks/useLocalState'
import { uuid, formatDate, formatCurrency, today, addDays, monthLabel } from '../../utils/helpers'

// Avança N meses mantendo o mesmo dia (respeita fim de mês)
function addMonths(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number)
  let nm = m + months
  let ny = y + Math.floor((nm - 1) / 12)
  nm = ((nm - 1) % 12) + 1
  const last = new Date(ny, nm, 0).getDate()
  return `${ny}-${String(nm).padStart(2,'0')}-${String(Math.min(d, last)).padStart(2,'0')}`
}
import Modal, { ConfirmModal } from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { IconEdit, IconTrash, IconCheck, IconUndo, IconLink } from '../../components/ui/icons'

function StatCard({ label, value, cls }) {
  return (
    <div className={`erp-stat ${cls}`}>
      <div className="s-label">{label}</div>
      <div className="s-value">{formatCurrency(value)}</div>
    </div>
  )
}

function ConfirmarModal({ conta, onClose, onDone }) {
  const [forma,   setForma]   = useState('pix')
  const [parteId, setParteId] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [erro,    setErro]    = useState('')
  const partes = readLocal('ts_partes', [])

  const handleConfirm = async () => {
    setErro(''); setSaving(true)
    const dt = today()
    const novosLancIds = []
    try {
      if (forma === 'pix') {
        const fin = readLocal('ts_financeiro', [])
        const l = { id:uuid(), descricao:conta.descricao, categoriaId:conta.categoriaId, parteId:null, valor:conta.valor, tipo:'despesa', data:dt, baixaCruzadaId:null, contaId:conta.id }
        await writeLocal('ts_financeiro', [...fin, l]); novosLancIds.push(l.id)

      } else if (forma === 'dinheiro') {
        const cax = readLocal('ts_caixinha', [])
        const l = { id:uuid(), descricao:conta.descricao, categoriaId:conta.categoriaId, parteId:null, valor:conta.valor, tipo:'despesa', data:dt, baixaCruzadaId:null, contaId:conta.id }
        await writeLocal('ts_caixinha', [...cax, l]); novosLancIds.push(l.id)

      } else if (forma === 'cruzado') {
        const baixaCruzadaId = uuid()
        const ob          = readLocal('ts_offBook', [])
        const parte       = partes.find(p => p.id === parteId)
        const allCats     = readLocal('ts_categorias', [])
        const catDespesa  = conta.categoriaId
        const catParteRel = (allCats.find(c => c.nome === 'Parte Relacionada') || {}).id

        if (!catParteRel) {
          setErro('Categoria "Parte Relacionada" não encontrada. Cadastre-a em Categorias.')
          setSaving(false); return
        }

        const db = { id:uuid(), descricao:conta.descricao, categoriaId:catDespesa, parteId:null, valor:conta.valor, tipo:'despesa', data:dt, baixaCruzadaId, contaId:conta.id }
        const cr = { id:uuid(), descricao:`Recebimento — ${parte?.nome||'Terceiro'}`, categoriaId:catParteRel, parteId:null, valor:conta.valor, tipo:'receita', data:dt, baixaCruzadaId, contaId:conta.id }
        const gc = { id:uuid(), descricao:conta.descricao, categoriaId:catParteRel, parteId, valor:conta.valor, tipo:'despesa', data:dt, baixaCruzadaId, contaId:conta.id }

        await writeLocal('ts_offBook', [...ob, db, cr, gc])
        novosLancIds.push(db.id, cr.id, gc.id)
      }

      const contas = readLocal('ts_contasPagar', [])
      await writeLocal('ts_contasPagar', contas.map(c =>
        c.id === conta.id ? { ...c, status:'confirmado', formaPagamento:forma, lancIds:novosLancIds } : c
      ))
      onDone(); onClose()
    } catch {
      setErro('Erro ao salvar. Verifique a conexão e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Confirmar Pagamento — ${conta.descricao}`} onClose={onClose} size="sm">
      <div style={{ padding:'10px 12px', background:'#F4F6F8', border:'1px solid #D8DDE6', borderRadius:'2px', marginBottom:'16px' }}>
        <div style={{ fontSize:'10px', color:'#54698D', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'3px' }}>Valor a Pagar</div>
        <div style={{ fontSize:'20px', fontWeight:700, color:'#C62828' }}>{formatCurrency(conta.valor)}</div>
      </div>
      <div style={{ marginBottom:'12px' }}>
        <label className="erp-label">Forma de Pagamento</label>
        <select value={forma} onChange={e => { setForma(e.target.value); setParteId('') }} className="erp-select">
          <option value="pix">PIX → Bancos</option>
          <option value="dinheiro">Dinheiro → Caixinha</option>
          <option value="cruzado">Cruzado → Off Book</option>
        </select>
      </div>
      {forma === 'cruzado' && (
        <>
          <div style={{ marginBottom:'10px', padding:'8px 10px', background:'#EAF3FB', border:'1px solid #A8C8E8', borderRadius:'2px', fontSize:'11px', color:'#0050A0', lineHeight:'1.5' }}>
            <strong>Partida dupla:</strong> Débito Off Book → Crédito Off Book (offset) → Débito Gestão de Contas
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
      {erro && <div style={{ margin:'10px 0', padding:'8px 10px', background:'#FDECEA', border:'1px solid #E8A09A', borderRadius:'2px', fontSize:'11px', color:'#C62828' }}>{erro}</div>}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
        <button onClick={onClose} disabled={saving} className="erp-btn erp-btn-secondary">Cancelar</button>
        <button onClick={handleConfirm} disabled={saving || (forma==='cruzado' && !parteId)}
          className="erp-btn erp-btn-danger">{saving ? 'Salvando...' : 'Confirmar Pagamento'}</button>
      </div>
    </Modal>
  )
}

function ContaForm({ initial, onClose, onDone }) {
  const fornecedores = readLocal('ts_fornecedores', [])
  const partes       = readLocal('ts_partes', [])
  const categorias   = readLocal('ts_categorias', []).filter(c => c.tipo==='despesa' || c.tipo==='ambos')

  const [form, setForm] = useState(() => initial
    ? { fornecedorId:initial.fornecedorId||'', parteId:initial.parteId||'', descricao:initial.descricao, categoriaId:initial.categoriaId, valor:initial.valor, vencimento:initial.vencimento }
    : { fornecedorId:'', parteId:'', descricao:'', categoriaId:'', valor:'', vencimento:today() }
  )

  // Série
  const [modo,          setModo]          = useState('unico')   // 'unico' | 'serie'
  const [temSinal,      setTemSinal]      = useState(false)
  const [sinalTipo,     setSinalTipo]     = useState('valor')
  const [sinalValor,    setSinalValor]    = useState('')
  const [qtdParcelas,   setQtdParcelas]   = useState(1)
  const [intervaloTipo, setIntervaloTipo] = useState('mensal')  // 'mensal' | 'personalizado'
  const [intervaloDias, setIntervaloDias] = useState(30)
  const [serieRows,     setSerieRows]     = useState([])        // linhas editáveis

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))
  const fornecedorRequired = !form.parteId

  const valorTotal = parseFloat(form.valor) || 0
  const sinalCalc  = (() => {
    if (!temSinal) return 0
    const v = parseFloat(sinalValor) || 0
    return sinalTipo === 'percentual' ? valorTotal * v / 100 : v
  })()
  const restante   = Math.max(0, valorTotal - sinalCalc)
  const qtd        = Math.max(1, parseInt(qtdParcelas) || 1)
  const valorParc  = qtd > 0 ? restante / qtd : 0

  // Gera datas com a estratégia selecionada
  const calcVenc = (base, i) => {
    if (intervaloTipo === 'mensal') return addMonths(base, i)
    const dias = parseInt(intervaloDias) || 30
    return i === 0 ? base : addDays(base, i * dias)
  }

  const gerarSerie = () => {
    if (!form.vencimento || !valorTotal) return
    const rows = []
    let parcelasOffset = 0
    if (temSinal && sinalCalc > 0) {
      rows.push({ id:uuid(), label:'Sinal', valor:sinalCalc, venc:form.vencimento })
      parcelasOffset = 1
    }
    for (let i = 1; i <= qtd; i++) {
      rows.push({
        id:    uuid(),
        label: qtd === 1 ? 'Pagamento único' : `Parcela ${i}/${qtd}`,
        valor: valorParc,
        venc:  calcVenc(form.vencimento, temSinal ? i : i - 1),
      })
    }
    setSerieRows(rows)
  }

  const updateRow = (id, field, val) =>
    setSerieRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r))

  const totalRows  = serieRows.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0)
  const totalOk    = Math.abs(totalRows - valorTotal) < 0.02

  const handleSubmit = (e) => {
    e.preventDefault()
    const contas = readLocal('ts_contasPagar', [])
    const base = {
      fornecedorId:   form.fornecedorId || null,
      parteId:        form.parteId || null,
      descricao:      form.descricao,
      categoriaId:    form.categoriaId,
      status:         'aberto',
      lancIds:        [],
      formaPagamento: null,
    }
    if (initial) {
      const p = { ...base, valor:parseFloat(form.valor)||0, vencimento:form.vencimento }
      writeLocal('ts_contasPagar', contas.map(c => c.id===initial.id ? { ...c, ...p } : c))
    } else if (modo === 'serie') {
      const novas = serieRows.map(r => ({
        ...base, id:uuid(),
        descricao:  `${form.descricao} — ${r.label}`,
        valor:      parseFloat((parseFloat(r.valor)||0).toFixed(2)),
        vencimento: r.venc,
      }))
      writeLocal('ts_contasPagar', [...contas, ...novas])
    } else {
      writeLocal('ts_contasPagar', [...contas, { ...base, id:uuid(), valor:parseFloat(form.valor)||0, vencimento:form.vencimento }])
    }
    onDone(); onClose()
  }

  const fmt = (v) => formatCurrency(v || 0)

  return (
    <Modal title={initial ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>

        {/* Identificação */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div>
            <label className="erp-label">Fornecedor{fornecedorRequired ? ' *' : ' (opcional)'}</label>
            <select value={form.fornecedorId} onChange={e => set('fornecedorId', e.target.value)}
              required={fornecedorRequired} className="erp-select">
              <option value="">Selecione o fornecedor...</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            {!fornecedorRequired && (
              <span style={{ fontSize:'11px', color:'#8A99A8', marginTop:'2px', display:'block' }}>Opcional quando há parte relacionada</span>
            )}
          </div>
          <div>
            <label className="erp-label">Parte Relacionada</label>
            <select value={form.parteId} onChange={e => set('parteId', e.target.value)} className="erp-select">
              <option value="">Nenhuma</option>
              {partes.map(p => <option key={p.id} value={p.id}>{p.nome}{p.tipo ? ` — ${p.tipo}` : ''}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom:'12px' }}>
          <label className="erp-label">Descrição *</label>
          <input value={form.descricao} onChange={e => set('descricao', e.target.value)} required className="erp-input" />
        </div>
        <div style={{ marginBottom:'14px' }}>
          <label className="erp-label">Categoria</label>
          <select value={form.categoriaId} onChange={e => set('categoriaId', e.target.value)} className="erp-select">
            <option value="">Selecione...</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {/* Modo */}
        {!initial && (
          <div style={{ marginBottom:'14px', display:'flex', gap:'20px' }}>
            {[['unico','Lançamento único'],['serie','Série de pagamentos']].map(([v,l]) => (
              <label key={v} style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'13px', fontWeight:modo===v?600:400, color:modo===v?'#0070D2':'#54698D' }}>
                <input type="radio" name="modo" value={v} checked={modo===v} onChange={() => { setModo(v); setSerieRows([]) }} /> {l}
              </label>
            ))}
          </div>
        )}

        {/* Único */}
        {(initial || modo === 'unico') && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
            <div><label className="erp-label">Valor (R$) *</label>
              <input type="number" min="0" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} required className="erp-input" /></div>
            <div><label className="erp-label">Vencimento *</label>
              <input type="date" value={form.vencimento} onChange={e => set('vencimento', e.target.value)} required className="erp-input" /></div>
          </div>
        )}

        {/* Série */}
        {!initial && modo === 'serie' && (
          <div style={{ border:'1px solid #D8DDE6', borderRadius:'2px', padding:'14px 16px', marginBottom:'14px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'12px' }}>
              Configuração da Série
            </div>

            {/* Valor + 1ª data */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div><label className="erp-label">Valor Total *</label>
                <input type="number" min="0" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} required className="erp-input" /></div>
              <div><label className="erp-label">Data do 1º Pagamento *</label>
                <input type="date" value={form.vencimento} onChange={e => set('vencimento', e.target.value)} required className="erp-input" /></div>
            </div>

            {/* Sinal */}
            <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'12px', flexWrap:'wrap' }}>
              <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap' }}>
                <input type="checkbox" checked={temSinal} onChange={e => setTemSinal(e.target.checked)} />
                Cobrar entrada / sinal
              </label>
              {temSinal && (
                <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                  <select value={sinalTipo} onChange={e => setSinalTipo(e.target.value)}
                    style={{ fontSize:'11px', border:'1px solid #D8DDE6', borderRadius:'2px', padding:'3px 6px', fontFamily:'inherit' }}>
                    <option value="valor">R$</option>
                    <option value="percentual">%</option>
                  </select>
                  <input type="number" min="0" step="0.01" value={sinalValor} onChange={e => setSinalValor(e.target.value)}
                    placeholder={sinalTipo==='percentual'?'Ex: 30':'Ex: 500,00'}
                    style={{ width:'110px', fontSize:'12px', border:'1px solid #D8DDE6', borderRadius:'2px', padding:'3px 8px', fontFamily:'inherit' }} />
                  {sinalCalc > 0 && <span style={{ fontSize:'12px', color:'#C62828', fontWeight:600 }}>= {fmt(sinalCalc)}</span>}
                </div>
              )}
            </div>

            {/* Parcelas + intervalo */}
            <div style={{ display:'flex', gap:'16px', alignItems:'flex-end', flexWrap:'wrap', marginBottom:'14px' }}>
              <div style={{ minWidth:'120px' }}>
                <label className="erp-label">Nº de Parcelas</label>
                <select value={qtdParcelas} onChange={e => setQtdParcelas(e.target.value)} className="erp-select">
                  {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => (
                    <option key={n} value={n}>{n===1?'1 (único)':n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="erp-label">Intervalo</label>
                <div style={{ display:'flex', gap:'12px', marginTop:'4px', alignItems:'center' }}>
                  {[['mensal','Mensal'],['personalizado','Personalizado']].map(([v,l]) => (
                    <label key={v} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', cursor:'pointer' }}>
                      <input type="radio" name="intervalo" value={v} checked={intervaloTipo===v}
                        onChange={() => setIntervaloTipo(v)} /> {l}
                    </label>
                  ))}
                  {intervaloTipo === 'personalizado' && (
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <input type="number" min="1" value={intervaloDias} onChange={e => setIntervaloDias(e.target.value)}
                        style={{ width:'60px', fontSize:'12px', border:'1px solid #D8DDE6', borderRadius:'2px', padding:'3px 6px', fontFamily:'inherit', textAlign:'center' }} />
                      <span style={{ fontSize:'12px', color:'#54698D' }}>dias</span>
                    </div>
                  )}
                </div>
                {intervaloTipo === 'mensal' && (
                  <span style={{ fontSize:'11px', color:'#8A99A8', display:'block', marginTop:'3px' }}>
                    Pagamento no mesmo dia do mês seguinte
                  </span>
                )}
              </div>

              <button type="button" onClick={gerarSerie}
                className="erp-btn erp-btn-primary erp-btn-sm"
                disabled={!form.vencimento || !form.valor}>
                ↻ Gerar / Recalcular
              </button>
            </div>

            {/* Tabela editável */}
            {serieRows.length > 0 && (
              <>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' }}>
                  Lançamentos — edite datas e valores conforme necessário
                </div>
                <div className="erp-panel">
                  <table className="erp-table">
                    <thead><tr>
                      <th style={{ width:'36px' }}>#</th>
                      <th>Descrição</th>
                      <th style={{ width:'140px' }}>Vencimento</th>
                      <th style={{ width:'130px' }} className="right">Valor (R$)</th>
                    </tr></thead>
                    <tbody>
                      {serieRows.map((r, i) => (
                        <tr key={r.id} style={{ background:i%2===0?'#fff':'#FAFBFC' }}>
                          <td className="muted center">{i+1}</td>
                          <td className="muted" style={{ fontSize:'11px' }}>{r.label}</td>
                          <td style={{ padding:'2px 4px' }}>
                            <input type="date" value={r.venc}
                              onChange={e => updateRow(r.id, 'venc', e.target.value)}
                              className="table-input" />
                          </td>
                          <td style={{ padding:'2px 4px' }}>
                            <input type="number" min="0" step="0.01" value={r.valor}
                              onChange={e => updateRow(r.id, 'valor', e.target.value)}
                              className="table-input right" />
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background:'#F4F6F8' }}>
                        <td colSpan={3} style={{ textAlign:'right', padding:'5px 10px', fontSize:'12px', fontWeight:700 }}>Total</td>
                        <td style={{ textAlign:'right', padding:'5px 10px', fontSize:'12px', fontWeight:700, color:totalOk?'#2E7D32':'#C62828' }}>
                          {fmt(totalRows)}
                          {totalOk ? ' ✓' : ` (esperado ${fmt(valorTotal)})`}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
          <button type="button" onClick={onClose} className="erp-btn erp-btn-secondary">Cancelar</button>
          <button type="submit" disabled={modo==='serie' && (!totalOk || serieRows.length===0)}
            className="erp-btn erp-btn-primary">
            {initial ? 'Salvar' : modo==='serie' ? `Criar ${serieRows.length} Lançamentos` : 'Criar'}
          </button>
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

export default function ContasPagar() {
  const [contas, setContas] = useLocalState('ts_contasPagar', [])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirmarItem, setConfirmarItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [cadeiaId, setCadeiaId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [statusFilter, setStatusFilter] = useState('aberto')
  const [monthFilter,  setMonthFilter]  = useState('')

  const fornecedores = readLocal('ts_fornecedores', [])
  const categorias   = readLocal('ts_categorias', [])

  const refresh = () => { setRefreshKey(k => k+1); setContas(readLocal('ts_contasPagar', [])) }

  const months     = [...new Set(contas.filter(c => c.vencimento).map(c => c.vencimento.substring(0, 7)))].sort().reverse()
  const baseContas = monthFilter ? contas.filter(c => c.vencimento?.startsWith(monthFilter)) : contas

  const filtered = baseContas.filter(c => !statusFilter || c.status === statusFilter)
  const aPagar = baseContas.filter(c => c.status==='aberto').reduce((s,c) => s+(c.valor||0), 0)
  const pago   = baseContas.filter(c => c.status==='confirmado').reduce((s,c) => s+(c.valor||0), 0)

  const handleEstorno = async (conta) => {
    const ids = conta.lancIds || []
    try {
      if (conta.formaPagamento==='pix')           { await writeLocal('ts_financeiro', readLocal('ts_financeiro',[]).filter(l => !ids.includes(l.id))) }
      else if (conta.formaPagamento==='dinheiro') { await writeLocal('ts_caixinha',   readLocal('ts_caixinha',  []).filter(l => !ids.includes(l.id))) }
      else if (conta.formaPagamento==='cruzado')  { await writeLocal('ts_offBook',    readLocal('ts_offBook',   []).filter(l => !ids.includes(l.id))) }
      setContas(prev => prev.map(c => c.id===conta.id ? { ...c, status:'aberto', formaPagamento:null, lancIds:[] } : c))
    } catch {
      alert('Erro ao estornar. Verifique a conexão e tente novamente.')
    }
  }

  const STATUS_TABS = [{ value:'', label:'Todos' }, { value:'aberto', label:'Em aberto' }, { value:'confirmado', label:'Confirmados' }]

  return (
    <div className="erp-fill">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <h2 style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.04em' }}>Contas a Pagar</h2>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="erp-btn erp-btn-primary erp-btn-sm">+ Nova Conta</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
        <StatCard label="A Pagar"    value={aPagar} cls="orange" />
        <StatCard label="Total Pago" value={pago}   cls="green"  />
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
            <th>Fornecedor</th><th>Descrição</th>
            <th style={{ width:'120px' }}>Categoria</th>
            <th style={{ width:'90px' }}>Vencimento</th>
            <th style={{ width:'80px' }}>Pagamento</th>
            <th className="right" style={{ width:'110px' }}>Valor</th>
            <th style={{ width:'90px' }}>Status</th>
            <th style={{ width:'160px' }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length===0 && <tr className="empty"><td colSpan={8}>Nenhuma conta encontrada</td></tr>}
            {filtered.map(conta => {
              const forn = fornecedores.find(f => f.id===conta.fornecedorId)
              const cat  = categorias.find(c => c.id===conta.categoriaId)
              const isCruzado = conta.lancIds?.length>0 && conta.formaPagamento==='cruzado'
              return (
                <tr key={conta.id}>
                  <td style={{ fontWeight:500 }}>{forn?.nome||'—'}</td>
                  <td>{conta.descricao}</td>
                  <td className="muted">{cat?.nome||'—'}</td>
                  <td className="muted">{formatDate(conta.vencimento)}</td>
                  <td>{conta.formaPagamento ? <Badge value={conta.formaPagamento}/> : '—'}</td>
                  <td className="right debit">{formatCurrency(conta.valor)}</td>
                  <td><Badge value={conta.status}/></td>
                  <td>
                    <span style={{ display:'flex', gap:'2px', alignItems:'center' }}>
                      {conta.status==='aberto' && <>
                        <button onClick={() => setConfirmarItem(conta)} className="erp-icon-btn" title="Confirmar pagamento"><IconCheck /></button>
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
      {confirmarItem && <ConfirmarModal conta={confirmarItem} onClose={() => setConfirmarItem(null)} onDone={refresh} />}
      {deleteItem && <ConfirmModal title="Excluir Conta" message={`Excluir "${deleteItem.descricao}"?`} danger onConfirm={() => setContas(prev => prev.filter(c => c.id!==deleteItem.id))} onClose={() => setDeleteItem(null)} />}
      {cadeiaId && <CadeiaModal id={cadeiaId} onClose={() => setCadeiaId(null)} />}
    </div>
  )
}
