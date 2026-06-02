import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState, readLocal, writeLocal } from '../hooks/useLocalState'
import { OrdemForm } from './Ordens'
import { uuid, formatDate, formatCurrency, today, addDays, generatePedidoNumber, monthLabel } from '../utils/helpers'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import ClienteModal, { LinkBtn } from '../components/ui/ClienteModal'
import Badge from '../components/ui/Badge'
import { IconEdit, IconTrash, IconPdf, IconPlus, IconCheck } from '../components/ui/icons'
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
  nome:     'TOP SAIL Náutica Ltda.',
  cnpj:     '00.000.000/0001-00',
  endereco: 'Rua das Embarcações, 123 — Marina Center',
  cidade:   'São Paulo — SP  ·  CEP: 00000-000',
  telefone: '(11) 99999-9999',
  email:    'contato@topsails.com.br',
}

// ── PDF generation via HTML template ─────────────────────────────────────────
function buildHTML(pedido, templateImagem) {
  // Dados da empresa (Cadastros → Empresa), com fallback para os valores padrão
  const emp = readLocal('ts_empresa', {})
  const company = {
    nome:     emp.nome     || COMPANY.nome,
    cnpj:     emp.cnpj     || COMPANY.cnpj,
    endereco: emp.endereco || COMPANY.endereco,
    cidade:   [emp.cidade, emp.uf, emp.cep ? `CEP: ${emp.cep}` : ''].filter(Boolean).join(' — ') || COMPANY.cidade,
    telefone: emp.telefone || COMPANY.telefone,
    email:    emp.email    || COMPANY.email,
  }
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

  const obsText = (pedido.observacoes || '').trim().replace(/\n/g, '<br>')

  // Dados bancários sempre do cadastro da empresa (emp já foi declarado acima)
  const bancosLinhas = [
    emp.pix     ? `PIX: ${emp.pix}`        : '',
    emp.banco   ? `Banco: ${emp.banco}`     : '',
    emp.agencia ? `Agência: ${emp.agencia}` : '',
    emp.conta   ? `C/C: ${emp.conta}`       : '',
  ].filter(Boolean)
  const bancosText = bancosLinhas.length
    ? bancosLinhas.join('<br>')
    : (pedido.dadosBancarios || '').trim().replace(/\n/g, '<br>')

  const titulo = `${pedido.numero}${cliente ? ' — ' + cliente.nome : ''}`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Open Sans',Arial,sans-serif; background:#fff; }
  @media print {
    * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { margin:0; }
    .page { padding-top:120px; }
  }
  .page {
    width:794px; padding:120px 50px 50px; position:relative;
    ${templateImagem
      ? `background:url('${templateImagem}') no-repeat top left / 100% 100%;`
      : 'background:#fff;'}
  }
  .bg-overlay { display:${templateImagem ? 'block' : 'none'}; position:absolute; inset:0; pointer-events:none; }

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
  .banking { flex:1; font-size:11.5px; color:#444; line-height:1.7;
    max-width:340px; margin-top:16px; }
  .banking strong { display:block; font-weight:700; margin-bottom:4px;
    color:#0057a8; }

  .totals { min-width:240px; }
  .total-row { display:flex; justify-content:space-between; align-items:center;
    padding:6px 0; border-bottom:1px solid #eee; font-size:13px; }
  .total-row .label  { color:#0057a8; font-weight:600; }
  .total-row .amount { color:#1a1a1a; font-weight:600; }
  .grand-total { display:flex; justify-content:space-between; align-items:center;
    padding:10px 0 0; margin-top:4px; }
  .grand-total .label  { font-size:15px; font-weight:700; color:#1a1a1a; }
  .grand-total .amount { font-size:26px; font-weight:800; color:#1a1a1a; }
</style>
</head>
<body>
<div class="page">

  <div class="company-info">
    <div class="name">${company.nome.toUpperCase()}</div>
    <div class="cnpj">${company.cnpj}</div>
    <div class="address">
      ${company.endereco}<br>
      ${company.cidade}<br>
      ${company.telefone}
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
      ${obsText ? `<strong>Observações:</strong><br>${obsText}` : ''}
      ${bancosText ? `<div class="banking"><strong>Dados Bancários</strong>${bancosText}</div>` : ''}
    </div>
    <div class="totals">
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

export async function gerarPDF(pedido) {
  const templateImagem = readLocal('ts_template_pedido', {})?.imagem || null

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;'
  document.body.appendChild(container)

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'width:794px;height:1123px;border:none;'
  container.appendChild(iframe)
  iframe.srcdoc = buildHTML(pedido, templateImagem)

  await new Promise(resolve => { iframe.onload = resolve })
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
      descricao:      `${ordem.numero} — ${r.label}${cli ? ' / ' + cli.nome : ''}`,
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
export function PreviewModal({ pedido, onClose }) {
  const [baixando, setBaixando] = useState(false)
  const [scale, setScale] = useState(1)
  const [templateCfg] = useLocalState('ts_template_pedido', {})
  const templateImagem = templateCfg?.imagem || null
  const html = buildHTML(pedido, templateImagem)
  const iframeRef = useRef(null)

  useEffect(() => {
    const update = () => {
      const available = window.innerWidth - 40
      setScale(Math.min(1, available / 794))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const handleBaixar = async () => {
    setBaixando(true)
    await gerarPDF(pedido)
    setBaixando(false)
  }

  const handleImprimir = () => {
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <div className="fixed inset-0 z-[500] flex flex-col" style={{ background:'rgba(0,0,0,0.75)' }}>
      {/* Toolbar */}
      <div style={{ background:'#1C2833', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px', padding:'10px 16px', flexShrink:0 }}>
        <div style={{ color:'#AFBAC4', fontSize:'13px', fontWeight:600, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {pedido.numero}
        </div>
        <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
          <button onClick={onClose} className="erp-btn erp-btn-secondary erp-btn-sm">
            Fechar
          </button>
          <button onClick={handleImprimir} className="erp-btn erp-btn-secondary erp-btn-sm">
            🖨 Imprimir
          </button>
          <button onClick={handleBaixar} disabled={baixando} className="erp-btn erp-btn-primary erp-btn-sm">
            {baixando ? 'Gerando…' : '⬇ Baixar PDF'}
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div style={{ flex:1, overflow:'auto', display:'flex', justifyContent:'center', padding:'20px' }}>
        <div style={{ width: 794 * scale, flexShrink:0 }}>
          <iframe
            ref={iframeRef}
            srcDoc={html}
            style={{
              width:'794px', minHeight:'1123px', border:'none',
              background:'#fff', boxShadow:'0 4px 24px rgba(0,0,0,0.4)',
              transformOrigin:'top left',
              transform:`scale(${scale})`,
              display:'block',
            }}
            title="Pré-visualização do orçamento"
          />
        </div>
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

function ItemRow({ item, idx, onUpdate, onRemove, onSelectProduct, produtos }) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top:0, left:0, width:0 })
  const inputRef = useRef(null)

  const sugestoes = item.descricao.trim().length > 0
    ? produtos.filter(p => p.nome.toLowerCase().includes(item.descricao.toLowerCase()))
    : produtos

  const openDrop = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom, left: r.left, width: r.width })
    }
    setOpen(true)
  }

  const handleSelect = (produto) => {
    onSelectProduct(item.id, produto)
    setOpen(false)
  }

  return (
    <tr key={item.id} style={{ background: idx%2===0?'#fff':'#FAFBFC' }}>
      {/* Descrição com autocomplete */}
      <td style={{ padding:0 }}>
        <input
          ref={inputRef}
          value={item.descricao}
          onChange={e => { onUpdate(item.id, 'descricao', e.target.value); openDrop() }}
          onFocus={openDrop}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="table-input"
          placeholder="Digite ou selecione um produto..."
          autoComplete="off"
        />
        {open && sugestoes.length > 0 && (
          <div style={{
            position:'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width,
            zIndex:9999,
            background:'#fff', border:'1px solid #D8DDE6', borderTop:'none',
            borderRadius:'0 0 2px 2px', boxShadow:'0 4px 12px rgba(0,0,0,.12)',
            maxHeight:'180px', overflowY:'auto',
          }}>
            {sugestoes.map(p => (
              <div
                key={p.id}
                onMouseDown={() => handleSelect(p)}
                style={{
                  padding:'7px 10px', cursor:'pointer', fontSize:'12px',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  borderBottom:'1px solid #F0F2F5',
                }}
                onMouseEnter={e => e.currentTarget.style.background='#EAF3FB'}
                onMouseLeave={e => e.currentTarget.style.background='#fff'}
              >
                <span style={{ fontWeight:500, color:'#16191F' }}>{p.nome}</span>
                <span style={{ color:'#54698D', fontSize:'11px', marginLeft:'12px', whiteSpace:'nowrap' }}>
                  {p.tipo && `${p.tipo} · `}
                  {p.valor ? `R$ ${Number(p.valor).toFixed(2).replace('.',',')}` : 'sem preço'}
                </span>
              </div>
            ))}
          </div>
        )}
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
  )
}

function ItensTabela({ itens, onUpdate, onAdd, onRemove, onSelectProduct }) {
  const produtos = readLocal('ts_produtos', [])

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
            <ItemRow
              key={item.id}
              item={item}
              idx={idx}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onSelectProduct={onSelectProduct}
              produtos={produtos}
            />
          ))}
        </tbody>
      </table>
      <div style={{ padding:'8px 10px', borderTop:'1px solid #E4E7EA' }}>
        <button type="button" onClick={onAdd} className="erp-btn erp-btn-secondary erp-btn-sm">+ Item</button>
      </div>
    </div>
  )
}

function TotaisBloco({ total }) {
  return (
    <div style={{ display:'flex', justifyContent:'flex-end' }}>
      <div style={{ width:'300px', background:'#fff', border:'1px solid #D8DDE6', borderRadius:'2px', overflow:'hidden' }}>
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
    itens: initial.itens?.length ? initial.itens : [EMPTY_ITEM()],
  } : {
    numero:         generatePedidoNumber(pedidos),
    data:           today(),
    clienteId:      '',
    embarcacao:     '',
    itens:          [EMPTY_ITEM()],
    observacoes:    '',
    dadosBancarios: (() => {
      const emp = readLocal('ts_empresa', {})
      const linhas = [
        emp.pix     ? `PIX: ${emp.pix}`        : '',
        emp.banco   ? `Banco: ${emp.banco}`     : '',
        emp.agencia ? `Agência: ${emp.agencia}` : '',
        emp.conta   ? `C/C: ${emp.conta}`       : '',
      ].filter(Boolean)
      return linhas.length ? linhas.join('\n') : DEFAULT_DADOS_BANCARIOS
    })(),
    status:         'pedAguardando',
  })

  const clientes = readLocal('ts_clientes', [])

  // Computed totals
  const subtotal = form.itens.reduce((s, i) => s + (parseFloat(i.precoTotal)||0), 0)
  const total    = subtotal

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

  const selectProduct = (id, produto) => {
    setForm(f => ({
      ...f,
      itens: f.itens.map(item => {
        if (item.id !== id) return item
        const qty   = parseFloat(item.quantidade) || 1
        const price = parseFloat(produto.valor)   || 0
        return { ...item, descricao: produto.nome, precoUnitario: price, precoTotal: qty * price }
      })
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...form, subtotal, descontoValor: 0, total, id:form.id||uuid() })
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
            onSelectProduct={selectProduct}
          />
        </div>

        {/* Totals */}
        <div style={{ marginBottom:'14px' }}>
          <TotaisBloco total={total} />
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
            onClick={() => { if(initial) onPreview({ ...form, subtotal, descontoValor: 0, total }) }}
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
  const [search,       setSearch]       = useState('')
  const [monthFilter,  setMonthFilter]  = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [osSourcePedido, setOsSourcePedido] = useState(null)
  const [previewPedido, setPreviewPedido] = useState(null)
  const [novaOsParaConta, setNovaOsParaConta] = useState(null)
  const [clienteModal, setClienteModal] = useState(null)

  const clientes = readLocal('ts_clientes', [])

  const months   = [...new Set(pedidos.filter(p => p.data).map(p => p.data.substring(0, 7)))].sort().reverse()
  const filtered = useMemo(() => pedidos.filter(p => {
    const cli = clientes.find(c => c.id === p.clienteId)
    const matchS = !search ||
      p.numero?.toLowerCase().includes(search.toLowerCase()) ||
      cli?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.embarcacao?.toLowerCase().includes(search.toLowerCase())
    const matchT = !statusFilter || p.status === statusFilter
    const matchM = !monthFilter  || p.data?.startsWith(monthFilter)
    return matchS && matchT && matchM
  }), [pedidos, search, statusFilter, monthFilter, clientes])

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
    <div className="erp-page">
      <nav className="erp-bc">
        <span>TOP SAIL</span><span className="sep">/</span><span className="cur">Pedidos</span>
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
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="erp-select" style={{ width:'140px' }}>
            <option value="">Todos os meses</option>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número, cliente ou embarcação..."
            className="erp-input" style={{ width:'260px', marginBottom:'1px' }} />
        </div>
      </div>

      {/* Table */}
      <div className="erp-panel erp-panel-fill">
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
                  <td style={{ fontWeight:500 }}>
                    {cli ? <LinkBtn onClick={() => setClienteModal(cli)}>{cli.nome}</LinkBtn> : '—'}
                  </td>
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
                    <span style={{ display:'flex', gap:'2px', alignItems:'center' }}>
                      <button onClick={() => { setEditItem(pedido); setShowForm(true) }}
                        className="erp-icon-btn" title="Editar"><IconEdit /></button>
                      {!temOS
                        ? <button onClick={() => handleGerarOS(pedido)}
                            className="erp-icon-btn os" title="Gerar OS a partir deste pedido">
                            <IconPlus size={13} />OS
                          </button>
                        : <span className="erp-icon-status green" title="OS gerada"><IconCheck /></span>
                      }
                      <button onClick={() => setPreviewPedido(pedido)}
                        className="erp-icon-btn" title="Pré-visualizar e exportar PDF"><IconPdf /></button>
                      <button onClick={() => setDeleteItem(pedido)}
                        className="erp-icon-btn danger" title="Excluir"><IconTrash /></button>
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
      {clienteModal && <ClienteModal cliente={clienteModal} onClose={() => setClienteModal(null)} onOpenPedido={p => { setClienteModal(null); setPreviewPedido(p) }} />}
    </div>
  )
}
