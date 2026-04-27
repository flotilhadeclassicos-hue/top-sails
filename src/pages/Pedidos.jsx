import { useState, useMemo } from 'react'
import { useLocalState, readLocal, writeLocal } from '../hooks/useLocalState'
import { OrdemForm } from './Ordens'
import { uuid, formatDate, formatCurrency, today, addDays, generatePedidoNumber } from '../utils/helpers'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_LIST = [
  { value:'pedAguardando', label:'Aguardando'         },
  { value:'pedEnviado',    label:'Enviado ao Cliente' },
  { value:'pedAprovado',   label:'Aprovado'           },
  { value:'pedRejeitado',  label:'Rejeitado'          },
]
const STATUS_TABS = [{ value:'', label:'Todos' }, ...STATUS_LIST]

const DEFAULT_DADOS_BANCARIOS =
  'PIX: contato@topsails.com.br\nBanco: Banco do Brasil\nAgência: 0001-1  |  C/C: 00000-0'

const COMPANY = {
  nome:     'Top Sails Náutica Ltda.',
  cnpj:     '00.000.000/0001-00',
  endereco: 'Rua das Embarcações, 123 — Marina Center',
  cidade:   'São Paulo — SP  ·  CEP: 00000-000',
  telefone: '(11) 99999-9999',
  email:    'contato@topsails.com.br',
}

// ── PDF generation via HTML template ─────────────────────────────────────────
function buildHTML(pedido) {
  const clientes = readLocal('ts_clientes', [])
  const cliente  = clientes.find(c => c.id === pedido.clienteId)

  const itensValidos = (pedido.itens || []).filter(i => i.descricao?.trim())

  const linhasTabela = itensValidos.map((item, idx) => `
    <tr>
      <td>${item.descricao}</td>
      <td class="center">${item.quantidade}</td>
      <td class="right">${formatCurrency(parseFloat(item.precoUnitario) || 0)}</td>
      <td class="right">${formatCurrency(parseFloat(item.precoTotal) || 0)}</td>
    </tr>`).join('')

  const obsText = [pedido.observacoes, pedido.dadosBancarios]
    .filter(Boolean)
    .map(t => t.trim())
    .join('\n\n')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Open Sans',Arial,sans-serif; background:#fff; }
  .page { background:#fff; width:794px; padding:40px 50px 50px; }

  .header { display:flex; justify-content:space-between; align-items:center;
    border-bottom:3px solid #0057a8; padding-bottom:20px; margin-bottom:28px; }
  .logos { display:flex; align-items:center; gap:18px; }
  .logo-img { height:52px; width:auto; display:block; object-fit:contain; }

  .company-info { margin-bottom:28px; }
  .company-info .name  { font-size:13px; font-weight:700; color:#1a1a1a; margin-bottom:2px; }
  .company-info .cnpj  { font-size:12px; color:#333; margin-bottom:4px; }
  .company-info .address { font-size:11.5px; color:#555; line-height:1.6; }

  .doc-title { font-size:30px; font-weight:800; color:#0057a8;
    margin-bottom:22px; letter-spacing:0.5px; }

  .meta-row { display:flex; justify-content:space-between; margin-bottom:28px; }
  .meta-block label { font-size:11px; font-weight:700; color:#333;
    display:block; margin-bottom:4px; }
  .meta-block .value { font-size:13px; color:#1a1a1a; line-height:1.5; }
  .meta-block.right { text-align:right; }

  hr.divider { border:none; border-top:1px solid #ccc; margin-bottom:20px; }

  .items-table { width:100%; border-collapse:collapse; margin-bottom:20px; }
  .items-table thead th { font-size:12px; font-weight:700; color:#0057a8;
    padding:8px 10px; border-bottom:2px solid #0057a8; text-align:left; }
  .items-table thead th.right  { text-align:right; }
  .items-table thead th.center { text-align:center; }
  .items-table tbody tr { border-bottom:1px solid #e8e8e8; }
  .items-table tbody tr:nth-child(even) { background:#f7f9fc; }
  .items-table tbody tr:nth-child(odd)  { background:#fff; }
  .items-table tbody td { font-size:12px; color:#1a1a1a; padding:9px 10px;
    vertical-align:middle; }
  .items-table tbody td.center { text-align:center; }
  .items-table tbody td.right  { text-align:right; }

  .bottom-area { display:flex; justify-content:space-between;
    align-items:flex-start; margin-top:10px; }
  .observations { flex:1; font-size:11.5px; color:#444; line-height:1.7;
    max-width:340px; }
  .observations strong { display:block; font-weight:700; margin-bottom:4px;
    color:#1a1a1a; }

  .totals { min-width:240px; }
  .total-row { display:flex; justify-content:space-between; align-items:center;
    padding:6px 0; border-bottom:1px solid #eee; font-size:13px; }
  .total-row .label  { color:#0057a8; font-weight:600; }
  .total-row .amount { color:#1a1a1a; font-weight:600; }
  .total-row.discount .label,
  .total-row.discount .amount { color:#0057a8; }
  .grand-total { display:flex; justify-content:space-between; align-items:center;
    padding:10px 0 0; margin-top:4px; }
  .grand-total .label  { font-size:15px; font-weight:700; color:#1a1a1a; }
  .grand-total .amount { font-size:26px; font-weight:800; color:#1a1a1a; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="logos">
      <img class="logo-img" src="data:image/jpeg;base64,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" alt="Harken B&G North Sails">
    </div>
  </div>

  <div class="company-info">
    <div class="name">${COMPANY.nome.toUpperCase()}</div>
    <div class="cnpj">${COMPANY.cnpj}</div>
    <div class="address">
      ${COMPANY.endereco}<br>
      ${COMPANY.cidade}<br>
      ${COMPANY.telefone}
    </div>
  </div>

  <div class="doc-title">ORÇAMENTO</div>

  <div class="meta-row">
    <div class="meta-block">
      <label>Fatura de</label>
      <div class="value">
        ${cliente?.nome || '—'}<br>
        ${pedido.embarcacao ? `Embarcação: ${pedido.embarcacao}` : '&nbsp;'}
      </div>
    </div>
    <div class="meta-block right">
      <label>Número</label>
      <div class="value">
        ${pedido.numero}<br>
        ${formatDate(pedido.data)}
      </div>
    </div>
  </div>

  <hr class="divider">

  <table class="items-table">
    <thead>
      <tr>
        <th>Descrição</th>
        <th class="center">Qtd</th>
        <th class="right">Preço unitário</th>
        <th class="right">Preço total</th>
      </tr>
    </thead>
    <tbody>
      ${linhasTabela}
    </tbody>
  </table>

  <div class="bottom-area">
    <div class="observations">
      ${obsText ? `<strong>Observações:</strong>${obsText}` : '&nbsp;'}
    </div>
    <div class="totals">
      <div class="total-row">
        <span class="label">Subtotal</span>
        <span class="amount">${formatCurrency(pedido.subtotal || 0)}</span>
      </div>
      <div class="total-row discount">
        <span class="label">DESCONTO</span>
        <span class="amount">${pedido.descontoValor > 0 ? '- ' + formatCurrency(pedido.descontoValor) : formatCurrency(0)}</span>
      </div>
      <div class="grand-total">
        <span class="label">Total</span>
        <span class="amount">${formatCurrency(pedido.total || 0)}</span>
      </div>
    </div>
  </div>

</div>
</body>
</html>`
}

async function gerarPDF(pedido) {
  // Monta o HTML em um iframe oculto para renderização fiel
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;'
  document.body.appendChild(container)

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'width:794px;height:1123px;border:none;'
  container.appendChild(iframe)

  iframe.srcdoc = buildHTML(pedido)

  await new Promise(resolve => { iframe.onload = resolve })
  // aguarda fontes e layout
  await new Promise(resolve => setTimeout(resolve, 600))

  const canvas = await html2canvas(iframe.contentDocument.body, {
    scale: 2,
    useCORS: true,
    width: 794,
    windowWidth: 794,
  })

  document.body.removeChild(container)

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' })
  const pdfW = pdf.internal.pageSize.getWidth()
  const pdfH = (canvas.height * pdfW) / canvas.width

  pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
  pdf.save(`${pedido.numero}.pdf`)
}

// ── Contas a Receber c/ Parcelamento ─────────────────────────────────────────
function ContasReceberModal({ ordem, pedido, onClose }) {
  const categorias = readLocal('ts_categorias', []).filter(c => c.tipo === 'receita')
  const clientes   = readLocal('ts_clientes', [])
  const cli        = clientes.find(c => c.id === ordem.clienteId)

  const [categoriaId,   setCategoriaId]   = useState(ordem.categoriaId || '')
  const [temSinal,      setTemSinal]      = useState(false)
  const [sinalTipo,     setSinalTipo]     = useState('valor')      // 'valor' | 'percentual'
  const [sinalValor,    setSinalValor]    = useState('')
  const [qtdParcelas,   setQtdParcelas]   = useState(1)
  const [intervaloDias, setIntervaloDias] = useState(30)
  const [primeiroVenc,  setPrimeiroVenc]  = useState(ordem.dataEntrega || today())

  const valorTotal = ordem.valor || 0

  const sinalCalc = (() => {
    if (!temSinal) return 0
    const v = parseFloat(sinalValor) || 0
    return sinalTipo === 'percentual' ? valorTotal * v / 100 : v
  })()

  const restante     = Math.max(0, valorTotal - sinalCalc)
  const qtd          = Math.max(1, parseInt(qtdParcelas) || 1)
  const valorParcela = qtd > 0 ? restante / qtd : 0

  // Monta preview das parcelas
  const rows = []
  if (temSinal && sinalCalc > 0) {
    rows.push({ label:'Sinal', valor: sinalCalc, venc: primeiroVenc })
  }
  for (let i = 1; i <= qtd; i++) {
    const offset = temSinal ? i * intervaloDias : (i - 1) * parseInt(intervaloDias)
    rows.push({
      label: qtd === 1 ? 'Pagamento único' : `Parcela ${i}/${qtd}`,
      valor: valorParcela,
      venc:  offset === 0 ? primeiroVenc : addDays(primeiroVenc, offset),
    })
  }

  const totalRows = rows.reduce((s, r) => s + r.valor, 0)

  const handleConfirmar = () => {
    let contas = readLocal('ts_contasReceber', [])

    // Remove a conta única gerada automaticamente pela OS (será substituída pelas parcelas)
    if (ordem.contaReceberId) {
      contas = contas.filter(c => c.id !== ordem.contaReceberId)
      // Limpa a referência na OS
      const ordens = readLocal('ts_ordens', [])
      writeLocal('ts_ordens', ordens.map(o =>
        o.id === ordem.id ? { ...o, contaReceberId: null } : o
      ))
    }

    const novas = rows.map(r => ({
      id:             uuid(),
      descricao:      `${ordem.numero} — ${r.label}${pedido ? ' / ' + pedido.numero : ''}`,
      categoriaId,
      valor:          parseFloat(r.valor.toFixed(2)),
      vencimento:     r.venc,
      status:         'aberto',
      ordemId:        ordem.id,
      pedidoId:       pedido?.id || null,
      lancIds:        [],
      formaPagamento: null,
      baixaCruzadaId: null,
    }))

    writeLocal('ts_contasReceber', [...contas, ...novas])
    onClose()
  }

  const labelStyle = { fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.04em', display:'block', marginBottom:'3px' }
  const infoStyle  = { fontSize:'12px', color:'#16191F', fontWeight:500 }

  return (
    <Modal title={`Contas a Receber — ${ordem.numero}`} onClose={onClose} size="lg">
      {/* Info */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', padding:'10px 12px', background:'#F4F6F8', border:'1px solid #D8DDE6', borderRadius:'2px', marginBottom:'16px' }}>
        <div><span style={labelStyle}>Cliente</span><span style={infoStyle}>{cli?.nome || '—'}</span></div>
        <div><span style={labelStyle}>OS</span><span style={{ ...infoStyle, fontFamily:'monospace', color:'#0070D2' }}>{ordem.numero}</span></div>
        <div><span style={labelStyle}>Pedido</span><span style={{ ...infoStyle, fontFamily:'monospace', color:'#0070D2' }}>{pedido?.numero || '—'}</span></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px' }}>
        {/* Valor total */}
        <div>
          <label className="erp-label">Valor Total da OS</label>
          <div style={{ padding:'6px 8px', background:'#F4F6F8', border:'1px solid #D8DDE6', borderRadius:'2px', fontSize:'16px', fontWeight:700, color:'#16191F' }}>
            {formatCurrency(valorTotal)}
          </div>
        </div>
        {/* Categoria */}
        <div>
          <label className="erp-label">Categoria</label>
          <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="erp-select">
            <option value="">Selecione...</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Parcelamento */}
      <div style={{ border:'1px solid #D8DDE6', borderRadius:'2px', padding:'14px 16px', marginBottom:'14px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'12px' }}>
          Parcelamento
        </div>

        {/* Sinal */}
        <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'12px', flexWrap:'wrap' }}>
          <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#16191F', cursor:'pointer', whiteSpace:'nowrap' }}>
            <input type="checkbox" checked={temSinal} onChange={e => setTemSinal(e.target.checked)} />
            Cobrar sinal / entrada
          </label>
          {temSinal && <>
            <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
              <select value={sinalTipo} onChange={e => setSinalTipo(e.target.value)}
                style={{ fontSize:'11px', border:'1px solid #D8DDE6', borderRadius:'2px', padding:'3px 6px', fontFamily:'inherit' }}>
                <option value="valor">R$</option>
                <option value="percentual">%</option>
              </select>
              <input type="number" min="0" step="0.01"
                value={sinalValor} onChange={e => setSinalValor(e.target.value)}
                placeholder={sinalTipo === 'percentual' ? 'Ex: 30' : 'Ex: 500,00'}
                style={{ width:'120px', fontSize:'12px', border:'1px solid #D8DDE6', borderRadius:'2px', padding:'3px 8px', fontFamily:'inherit' }} />
            </div>
            {sinalCalc > 0 && (
              <span style={{ fontSize:'12px', color:'#2E7D32', fontWeight:600 }}>= {formatCurrency(sinalCalc)}</span>
            )}
          </>}
        </div>

        {/* Parcelas */}
        <div style={{ display:'grid', gridTemplateColumns:'120px 140px 1fr', gap:'12px', alignItems:'end' }}>
          <div>
            <label className="erp-label">Nº de Parcelas</label>
            <select value={qtdParcelas} onChange={e => setQtdParcelas(e.target.value)} className="erp-select">
              {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => (
                <option key={n} value={n}>{n === 1 ? '1 (único)' : n}</option>
              ))}
            </select>
          </div>
          {qtdParcelas > 1 && (
            <div>
              <label className="erp-label">Intervalo (dias)</label>
              <select value={intervaloDias} onChange={e => setIntervaloDias(e.target.value)} className="erp-select">
                {[15,30,45,60,90].map(d => <option key={d} value={d}>{d} dias</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="erp-label">Vencimento {temSinal ? 'da 1ª Parcela' : qtdParcelas === 1 ? 'do Pagamento' : 'da 1ª Parcela'}</label>
            <input type="date" value={primeiroVenc} onChange={e => setPrimeiroVenc(e.target.value)} className="erp-input" />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div style={{ marginBottom:'16px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' }}>
          Parcelas a Criar ({rows.length})
        </div>
        <div className="erp-panel">
          <table className="erp-table">
            <thead><tr>
              <th style={{ width:'40px' }}>#</th>
              <th>Descrição</th>
              <th style={{ width:'110px' }}>Vencimento</th>
              <th className="right" style={{ width:'130px' }}>Valor</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="muted center">{i + 1}</td>
                  <td>{r.label}</td>
                  <td className="muted">{formatDate(r.venc)}</td>
                  <td className="right" style={{ fontWeight:600 }}>{formatCurrency(r.valor)}</td>
                </tr>
              ))}
              <tr style={{ background:'#F4F6F8', fontWeight:700 }}>
                <td colSpan={3} style={{ textAlign:'right', padding:'5px 10px', fontSize:'12px', color:'#16191F' }}>Total</td>
                <td className="right" style={{ fontWeight:700, color: Math.abs(totalRows - valorTotal) < 0.02 ? '#2E7D32' : '#C62828', padding:'5px 10px', fontSize:'12px' }}>
                  {formatCurrency(totalRows)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {Math.abs(totalRows - valorTotal) > 0.02 && (
          <div style={{ marginTop:'6px', fontSize:'11px', color:'#C62828' }}>
            ⚠ Total das parcelas ({formatCurrency(totalRows)}) difere do valor da OS ({formatCurrency(valorTotal)}). Revise o sinal.
          </div>
        )}
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
        <button onClick={onClose} className="erp-btn erp-btn-secondary">Cancelar</button>
        <button onClick={handleConfirmar} disabled={!categoriaId || rows.length === 0}
          className="erp-btn erp-btn-primary">
          Confirmar e Criar {rows.length} {rows.length === 1 ? 'Conta' : 'Contas'}
        </button>
      </div>
    </Modal>
  )
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ pedido, onClose }) {
  const [exportando, setExportando] = useState(false)
  const html = buildHTML(pedido)

  const handleExportar = async () => {
    setExportando(true)
    await gerarPDF(pedido)
    setExportando(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background:'rgba(0,0,0,0.75)' }}>
      {/* Toolbar */}
      <div style={{ background:'#1C2833', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px', flexShrink:0 }}>
        <div style={{ color:'#AFBAC4', fontSize:'13px', fontWeight:600 }}>
          Pré-visualização — {pedido.numero}
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose} className="erp-btn erp-btn-secondary erp-btn-sm">
            Fechar
          </button>
          <button onClick={handleExportar} disabled={exportando} className="erp-btn erp-btn-primary erp-btn-sm">
            {exportando ? 'Gerando PDF…' : '⬇ Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div style={{ flex:1, overflow:'auto', display:'flex', justifyContent:'center', padding:'30px 20px' }}>
        <iframe
          srcDoc={html}
          style={{ width:'794px', minHeight:'1123px', border:'none', background:'#fff', boxShadow:'0 4px 24px rgba(0,0,0,0.4)', flexShrink:0 }}
          title="Pré-visualização do orçamento"
        />
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, cls }) {
  return (
    <div className={`erp-stat ${cls}`}>
      <div className="s-label">{label}</div>
      <div className="s-value">{formatCurrency(value)}</div>
    </div>
  )
}

function ItensTabela({ itens, onUpdate, onAdd, onRemove }) {
  return (
    <div className="erp-panel">
      <table className="erp-table">
        <thead><tr>
          <th>Descrição do Serviço / Produto</th>
          <th style={{ width:'55px' }} className="center">Qtd</th>
          <th style={{ width:'120px' }} className="right">Preço Unit. (R$)</th>
          <th style={{ width:'120px' }} className="right">Preço Total</th>
          <th style={{ width:'32px' }}></th>
        </tr></thead>
        <tbody>
          {itens.length === 0 && (
            <tr className="empty"><td colSpan={5}>Nenhum item. Clique em "+ Item" para adicionar.</td></tr>
          )}
          {itens.map((item, idx) => (
            <tr key={item.id} style={{ background: idx%2===0?'#fff':'#FAFBFC' }}>
              <td style={{ padding:0 }}>
                <input value={item.descricao} onChange={e => onUpdate(item.id,'descricao',e.target.value)}
                  className="table-input" placeholder="Descrição do item..." />
              </td>
              <td style={{ padding:0 }}>
                <input type="number" min="0" step="0.01" value={item.quantidade}
                  onChange={e => onUpdate(item.id,'quantidade',e.target.value)}
                  className="table-input center" />
              </td>
              <td style={{ padding:0 }}>
                <input type="number" min="0" step="0.01" value={item.precoUnitario}
                  onChange={e => onUpdate(item.id,'precoUnitario',e.target.value)}
                  className="table-input right" />
              </td>
              <td className="right" style={{ fontWeight:600, paddingRight:'10px' }}>
                {formatCurrency(parseFloat(item.precoTotal)||0)}
              </td>
              <td className="center">
                <button type="button" onClick={() => onRemove(item.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#C62828', fontSize:'16px', lineHeight:1, padding:'2px' }}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding:'8px 10px', borderTop:'1px solid #E4E7EA' }}>
        <button type="button" onClick={onAdd} className="erp-btn erp-btn-secondary erp-btn-sm">+ Item</button>
      </div>
    </div>
  )
}

function TotaisBloco({ subtotal, descontoTipo, desconto, descontoValor, total, onChange }) {
  return (
    <div style={{ display:'flex', justifyContent:'flex-end' }}>
      <div style={{ width:'300px', background:'#fff', border:'1px solid #D8DDE6', borderRadius:'2px', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', borderBottom:'1px solid #E4E7EA' }}>
          <span style={{ fontSize:'12px', color:'#54698D' }}>Subtotal</span>
          <span style={{ fontSize:'12px', fontWeight:600 }}>{formatCurrency(subtotal)}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', borderBottom:'1px solid #E4E7EA' }}>
          <span style={{ fontSize:'12px', color:'#54698D', flex:1 }}>Desconto</span>
          <select value={descontoTipo} onChange={e => onChange('descontoTipo', e.target.value)}
            style={{ fontSize:'11px', border:'1px solid #D8DDE6', borderRadius:'2px', padding:'2px 5px', fontFamily:'inherit', color:'#16191F' }}>
            <option value="valor">R$</option>
            <option value="percentual">%</option>
          </select>
          <input type="number" min="0" step="0.01" value={desconto}
            onChange={e => onChange('desconto', e.target.value)}
            style={{ width:'80px', fontSize:'12px', border:'1px solid #D8DDE6', borderRadius:'2px', padding:'3px 6px', textAlign:'right', fontFamily:'inherit' }} />
        </div>
        {descontoValor > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 12px', background:'#FFF8F8', borderBottom:'1px solid #E4E7EA' }}>
            <span style={{ fontSize:'11px', color:'#C62828' }}>Valor descontado</span>
            <span style={{ fontSize:'11px', color:'#C62828', fontWeight:600 }}>- {formatCurrency(descontoValor)}</span>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', background:'#1C2833' }}>
          <span style={{ fontSize:'13px', fontWeight:700, color:'#AFBAC4' }}>TOTAL FINAL</span>
          <span style={{ fontSize:'17px', fontWeight:700, color:'#FFFFFF' }}>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Status select inline (mesmas cores dos badges) ───────────────────────────
const STATUS_COLORS = {
  pedAguardando: { bg:'#FEF3CD', border:'#E0A000', color:'#5F4000' },
  pedEnviado:    { bg:'#EAF3FB', border:'#A8C8E8', color:'#0050A0' },
  pedAprovado:   { bg:'#EFFFEF', border:'#88C088', color:'#1A5C1A' },
  pedRejeitado:  { bg:'#FDECEA', border:'#E89088', color:'#8B0000' },
}

function StatusSelect({ value, onChange }) {
  const c = STATUS_COLORS[value] || { bg:'#F4F6F8', border:'#ADADAD', color:'#444' }
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background:   c.bg,
        border:       `1px solid ${c.border}`,
        color:        c.color,
        borderRadius: '2px',
        padding:      '2px 4px',
        fontSize:     '11px',
        fontWeight:   600,
        fontFamily:   'inherit',
        cursor:       'pointer',
        width:        '100%',
      }}
    >
      {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  )
}

// ── Form helpers (fora do componente para evitar remontagem a cada render) ────
const EMPTY_ITEM = () => ({ id:uuid(), descricao:'', quantidade:1, precoUnitario:0, precoTotal:0 })

function FRow({ children, cols = '1fr 1fr 1fr 1fr' }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:cols, gap:'12px', marginBottom:'12px' }}>
      {children}
    </div>
  )
}

function FF({ label, col, children }) {
  return (
    <div style={{ gridColumn:col }}>
      <label className="erp-label">{label}</label>
      {children}
    </div>
  )
}

// ── Form modal ────────────────────────────────────────────────────────────────
function PedidoForm({ initial, pedidos, onSave, onClose, onPreview }) {
  const [form, setForm] = useState(() => initial ? {
    ...initial,
    desconto:     initial.desconto     ?? 0,
    descontoTipo: initial.descontoTipo ?? 'valor',
    itens:        initial.itens?.length ? initial.itens : [EMPTY_ITEM()],
  } : {
    numero:         generatePedidoNumber(pedidos),
    data:           today(),
    clienteId:      '',
    embarcacao:     '',
    itens:          [EMPTY_ITEM()],
    descontoTipo:   'valor',
    desconto:       0,
    observacoes:    '',
    dadosBancarios: DEFAULT_DADOS_BANCARIOS,
    status:         'pedAguardando',
  })

  const clientes = readLocal('ts_clientes', [])

  // Computed totals (not stored in state during editing)
  const subtotal = form.itens.reduce((s, i) => s + (parseFloat(i.precoTotal)||0), 0)
  const descontoValor = form.descontoTipo === 'percentual'
    ? subtotal * (parseFloat(form.desconto)||0) / 100
    : (parseFloat(form.desconto)||0)
  const total = Math.max(0, subtotal - descontoValor)

  const set = (field, value) => setForm(f => ({ ...f, [field]:value }))

  const updateItem = (id, field, value) => {
    setForm(f => ({
      ...f,
      itens: f.itens.map(item => {
        if (item.id !== id) return item
        const upd = { ...item, [field]:value }
        const qty   = parseFloat(field==='quantidade'    ? value : item.quantidade)    || 0
        const price = parseFloat(field==='precoUnitario' ? value : item.precoUnitario) || 0
        upd.precoTotal = qty * price
        return upd
      })
    }))
  }

  const addItem    = () => setForm(f => ({ ...f, itens:[...f.itens, EMPTY_ITEM()] }))
  const removeItem = (id) => setForm(f => ({ ...f, itens: f.itens.filter(i => i.id !== id) }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...form, subtotal, descontoValor, total, id:form.id||uuid() })
    onClose()
  }

  return (
    <Modal title={initial ? `Editar ${initial.numero}` : 'Novo Pedido (Orçamento)'} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit}>
        {/* Row 1: número, data, status */}
        <FRow cols="1fr 1fr 1fr">
          <FF label="Número">
            <input value={form.numero} readOnly className="erp-input"
              style={{ background:'#F4F6F8', color:'#54698D', fontFamily:'monospace', fontWeight:600 }} />
          </FF>
          <FF label="Data do Pedido *">
            <input type="date" value={form.data} onChange={e => set('data',e.target.value)} required className="erp-input" />
          </FF>
          <FF label="Status">
            <select value={form.status} onChange={e => set('status',e.target.value)} className="erp-select">
              {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FF>
        </FRow>

        {/* Row 2: cliente, embarcação */}
        <FRow cols="1fr 1fr">
          <FF label="Cliente *">
            <select value={form.clienteId} onChange={e => set('clienteId',e.target.value)} required className="erp-select">
              <option value="">Selecione o cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </FF>
          <FF label="Embarcação">
            <input value={form.embarcacao} onChange={e => set('embarcacao',e.target.value)} className="erp-input" placeholder="Nome / modelo da embarcação" />
          </FF>
        </FRow>

        {/* Items */}
        <div style={{ marginBottom:'14px' }}>
          <label className="erp-label" style={{ marginBottom:'6px', display:'block' }}>Itens do Pedido</label>
          <ItensTabela
            itens={form.itens}
            onUpdate={updateItem}
            onAdd={addItem}
            onRemove={removeItem}
          />
        </div>

        {/* Totals */}
        <div style={{ marginBottom:'14px' }}>
          <TotaisBloco
            subtotal={subtotal}
            descontoTipo={form.descontoTipo}
            desconto={form.desconto}
            descontoValor={descontoValor}
            total={total}
            onChange={set}
          />
        </div>

        {/* Obs + bank data */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'4px' }}>
          <FF label="Observações">
            <textarea value={form.observacoes} onChange={e => set('observacoes',e.target.value)} rows={4} className="erp-textarea" placeholder="Condições, prazos, garantias..." />
          </FF>
          <FF label="Dados Bancários">
            <textarea value={form.dadosBancarios} onChange={e => set('dadosBancarios',e.target.value)} rows={4} className="erp-textarea" />
          </FF>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
          <button type="button"
            onClick={() => { if(initial) onPreview({ ...form, subtotal, descontoValor, total }) }}
            disabled={!initial}
            className="erp-btn erp-btn-secondary erp-btn-sm"
            title={!initial ? 'Salve o pedido primeiro para visualizar o PDF' : 'Pré-visualizar e exportar PDF'}
          >
            🔍 Pré-visualizar PDF
          </button>
          <div style={{ display:'flex', gap:'8px' }}>
            <button type="button" onClick={onClose} className="erp-btn erp-btn-secondary">Cancelar</button>
            <button type="submit" className="erp-btn erp-btn-primary">Salvar Pedido</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Pedidos() {
  const [pedidos, setPedidos] = useLocalState('ts_pedidos', [])
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]  = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [osSourcePedido, setOsSourcePedido] = useState(null)
  const [previewPedido, setPreviewPedido] = useState(null)
  const [novaOsParaConta, setNovaOsParaConta] = useState(null)

  const clientes = readLocal('ts_clientes', [])

  const filtered = useMemo(() => pedidos.filter(p => {
    const cli = clientes.find(c => c.id === p.clienteId)
    const matchS = !search ||
      p.numero?.toLowerCase().includes(search.toLowerCase()) ||
      cli?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.embarcacao?.toLowerCase().includes(search.toLowerCase())
    const matchT = !statusFilter || p.status === statusFilter
    return matchS && matchT
  }), [pedidos, search, statusFilter, clientes])

  const handleSave = (item) => {
    setPedidos(prev =>
      prev.find(p => p.id === item.id)
        ? prev.map(p => p.id === item.id ? item : p)
        : [...prev, item]
    )
  }

  const handleStatusChange = (id, newStatus) => {
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
  }

  const handleDelete = (item) => setPedidos(prev => prev.filter(p => p.id !== item.id))

  const handleGerarOS = (pedido) => setOsSourcePedido(pedido)

  const preFilledOrdem = osSourcePedido ? {
    clienteId:   osSourcePedido.clienteId,
    embarcacao:  osSourcePedido.embarcacao || '',
    categoriaId: '',
    descricao:   (osSourcePedido.itens || [])
      .filter(i => i.descricao?.trim())
      .map(i => i.quantidade > 1 ? `${i.descricao} (${i.quantidade}x)` : i.descricao)
      .join('\n'),
    dataRetirada: today(),
    prazoDias:   '',
    valor:       osSourcePedido.total || 0,
    status:      'aguardando',
    pedidoId:    osSourcePedido.id,
  } : null

  const handleSaveOS = (item) => {
    // Salva a OS no localStorage
    const ordens = readLocal('ts_ordens', [])
    writeLocal('ts_ordens', ordens.find(o => o.id === item.id)
      ? ordens.map(o => o.id === item.id ? item : o)
      : [...ordens, item]
    )
    // Aprova o pedido e registra o vínculo com a OS gerada
    if (osSourcePedido) {
      setPedidos(prev => prev.map(p =>
        p.id === osSourcePedido.id
          ? { ...p, status: 'pedAprovado', ordemId: item.id, ordemNumero: item.numero }
          : p
      ))
      // Abre o modal de parcelamento de Contas a Receber
      setNovaOsParaConta({ ordem: item, pedido: osSourcePedido })
    }
  }

  // Summary cards
  const totalAguardando = pedidos.filter(p => p.status==='pedAguardando').reduce((s,p)=>s+(p.total||0),0)
  const totalAprovado   = pedidos.filter(p => p.status==='pedAprovado').reduce((s,p)=>s+(p.total||0),0)
  const totalEnviado    = pedidos.filter(p => p.status==='pedEnviado').reduce((s,p)=>s+(p.total||0),0)

  return (
    <div style={{ padding:'20px 24px' }}>
      <nav className="erp-bc">
        <span>Top Sails</span><span className="sep">/</span><span className="cur">Pedidos</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">Pedidos (Orçamentos)</h1>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="erp-btn erp-btn-primary erp-btn-sm">
          + Novo Pedido
        </button>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px' }}>
        <StatCard label="Em Aguardo"          value={totalAguardando} cls="orange" />
        <StatCard label="Enviados ao Cliente" value={totalEnviado}    cls="blue"   />
        <StatCard label="Aprovados"           value={totalAprovado}   cls="green"  />
      </div>

      {/* Tabs + search */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #D8DDE6', marginBottom:'12px' }}>
        <div style={{ display:'flex' }}>
          {STATUS_TABS.map(t => (
            <button key={t.value} onClick={() => setStatusFilter(t.value)}
              className={`erp-tab ${statusFilter===t.value?'active':''}`}>
              {t.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por número, cliente ou embarcação..."
          className="erp-input" style={{ width:'290px', marginBottom:'1px' }} />
      </div>

      {/* Table */}
      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th style={{ width:'130px' }}>Número</th>
            <th>Cliente</th>
            <th>Embarcação</th>
            <th style={{ width:'90px' }}>Data</th>
            <th className="right" style={{ width:'120px' }}>Total</th>
            <th style={{ width:'120px' }}>Status</th>
            <th style={{ width:'110px' }}>OS Vinculada</th>
            <th style={{ width:'170px' }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr className="empty"><td colSpan={8}>Nenhum pedido encontrado</td></tr>}
            {[...filtered].reverse().map(pedido => {
              const cli = clientes.find(c => c.id === pedido.clienteId)
              const temOS = !!pedido.ordemId
              return (
                <tr key={pedido.id}>
                  <td>
                    <button onClick={() => { setEditItem(pedido); setShowForm(true) }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'monospace', color:'#0070D2', fontWeight:700, fontSize:'12px', padding:0, textDecoration:'underline' }}>
                      {pedido.numero}
                    </button>
                  </td>
                  <td style={{ fontWeight:500 }}>{cli?.nome||'—'}</td>
                  <td className="muted">{pedido.embarcacao||'—'}</td>
                  <td className="muted">{formatDate(pedido.data)}</td>
                  <td className="right" style={{ fontWeight:600 }}>{formatCurrency(pedido.total||0)}</td>
                  <td style={{ padding:'4px 6px' }}>
                    <StatusSelect value={pedido.status} onChange={v => handleStatusChange(pedido.id, v)} />
                  </td>
                  <td className="center">
                    {temOS
                      ? <span style={{ fontFamily:'monospace', fontSize:'11px', color:'#0070D2', fontWeight:700 }}>{pedido.ordemNumero}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    <span style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
                      <button onClick={() => { setEditItem(pedido); setShowForm(true) }}
                        className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                      {!temOS
                        ? <button onClick={() => handleGerarOS(pedido)}
                            className="erp-btn erp-btn-secondary erp-btn-xs"
                            title="Gerar OS a partir deste pedido">
                            ＋ Gerar OS
                          </button>
                        : <span style={{ fontSize:'11px', color:'#2E7D32', fontWeight:600 }}>✓ OS gerada</span>
                      }
                      <button onClick={() => setPreviewPedido(pedido)}
                        className="erp-btn erp-btn-secondary erp-btn-xs" title="Pré-visualizar e exportar PDF">
                        🔍 PDF
                      </button>
                      <button onClick={() => setDeleteItem(pedido)}
                        className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PedidoForm
          initial={editItem}
          pedidos={pedidos}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          onPreview={(dados) => { setShowForm(false); setPreviewPedido(dados) }}
        />
      )}

      {deleteItem && (
        <ConfirmModal
          title="Excluir Pedido"
          message={`Confirma a exclusão do pedido ${deleteItem.numero}?`}
          danger
          onConfirm={() => handleDelete(deleteItem)}
          onClose={() => setDeleteItem(null)}
        />
      )}

      {previewPedido && (
        <PreviewModal pedido={previewPedido} onClose={() => setPreviewPedido(null)} />
      )}

      {novaOsParaConta && (
        <ContasReceberModal
          ordem={novaOsParaConta.ordem}
          pedido={novaOsParaConta.pedido}
          onClose={() => setNovaOsParaConta(null)}
        />
      )}

      {osSourcePedido && preFilledOrdem && (
        <OrdemForm
          initial={preFilledOrdem}
          ordens={readLocal('ts_ordens', [])}
          onSave={handleSaveOS}
          onClose={() => setOsSourcePedido(null)}
        />
      )}
    </div>
  )
}
