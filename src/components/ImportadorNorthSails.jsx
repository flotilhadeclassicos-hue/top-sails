import { useState } from 'react'
import { readLocal, writeLocal } from '../hooks/useLocalState'
import { uuid, formatCurrency, today } from '../utils/helpers'
import Modal from './ui/Modal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseBR(s) {
  if (!s) return 0
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0
}

function parseDateBR(s) {
  if (!s) return today()
  const parts = s.split('/')
  if (parts.length !== 3) return today()
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
}

function extractRef(desc) {
  if (!desc) return null
  const m = desc.match(/OC\s+n[oº°]?\s*((?:OD)?OBR\d+)\s*\((\d+)\/(\d+)\)/i)
  return m ? `${m[1]}_${m[2]}_${m[3]}` : null
}

// ── PDF Extraction ────────────────────────────────────────────────────────────

async function extractTextFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise

  let fullText = ''
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()

    // Group items by y-coordinate (bucket to 4pt grid = same line)
    const lineMap = new Map()
    for (const item of content.items) {
      if (!item.str?.trim()) continue
      const y = Math.round(item.transform[5] / 4) * 4
      if (!lineMap.has(y)) lineMap.set(y, [])
      lineMap.get(y).push({ x: item.transform[4], text: item.str })
    }

    // Sort top→bottom (higher y = higher on page in PDF space)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a)
    for (const y of sortedYs) {
      const items = lineMap.get(y).sort((a, b) => a.x - b.x)
      const lineText = items.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim()
      if (lineText) fullText += lineText + '\n'
    }
  }

  return fullText
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseExtrato(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const headerMatch = text.match(/Relatório de Comissões\s*[-–]\s*(\d{2})\/(\d{4})/i)
  if (!headerMatch)
    throw new Error('Documento não reconhecido. Certifique-se de que é um Relatório de Comissões North Sails.')

  const mes = headerMatch[1]
  const ano = headerMatch[2]
  const importId = `northsails_${mes}_${ano}`

  const saldoMatch = text.match(/Saldo antes de[^\n]+([\d.]+,\d{2})/)
  const saldoAnterior = saldoMatch ? parseBR(saldoMatch[1]) : 0

  let section = null
  const comissoesMes   = []
  const outrosDebitos  = []
  const pendentes      = []

  let pDate = null
  let pDesc = ''

  const isSkip = l =>
    /^(Data cr[eé]dito|Data op[eei]|Data vcto|Descrição|Total de|Saldo |Base c|Valor par|Situação|Comissões do mês|Outros débitos|Resumo|\(\+\)|\(-\)|\(=\))/i.test(l)

  const flush3 = (date, desc, n1, n2, n3, target) =>
    target.push({ data: parseDateBR(date), descricao: desc.trim(), valorParcela: parseBR(n1), baseComissao: parseBR(n2), valorComissao: parseBR(n3), ref: extractRef(desc) })

  const flush1 = (date, desc, n1, target) =>
    target.push({ data: parseDateBR(date), descricao: desc.trim(), valor: parseBR(n1) })

  for (const line of lines) {
    // Section markers
    if (/^Comissões do mês/i.test(line))          { section = 'comissoes'; pDate = null; pDesc = ''; continue }
    if (/^\(-\)\s*Outros débitos/i.test(line))    { section = 'debitos';   pDate = null; pDesc = ''; continue }
    if (/^Resumo\s*$/i.test(line))                { section = null;        pDate = null; pDesc = ''; continue }
    if (/^Comissões ainda pendentes/i.test(line)) { section = 'pendentes'; pDate = null; pDesc = ''; continue }
    if (!section) continue
    if (isSkip(line)) { pDate = null; pDesc = ''; continue }

    const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/)

    // ── Comissões do mês ─────────────────────────────────────────────────────
    if (section === 'comissoes') {
      const full = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/)
      if (full) { pDate = null; pDesc = ''; flush3(full[1], full[2], full[3], full[4], full[5], comissoesMes); continue }
      if (dateMatch) { pDate = dateMatch[1]; pDesc = line.slice(dateMatch[0].length).trim(); continue }
      if (pDate) {
        const nums = line.match(/^(.*?)\s*([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/)
        if (nums) { flush3(pDate, (pDesc + ' ' + nums[1]).replace(/\s+/g, ' '), nums[2], nums[3], nums[4], comissoesMes); pDate = null; pDesc = '' }
        else pDesc += ' ' + line
      }
    }

    // ── Outros débitos ────────────────────────────────────────────────────────
    if (section === 'debitos') {
      const full = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+([\d.]+,\d{2})\s*$/)
      if (full) { pDate = null; pDesc = ''; flush1(full[1], full[2], full[3], outrosDebitos); continue }
      if (dateMatch) { pDate = dateMatch[1]; pDesc = line.slice(dateMatch[0].length).trim(); continue }
      if (pDate) {
        const nums = line.match(/^(.*?)\s*([\d.]+,\d{2})\s*$/)
        if (nums) { flush1(pDate, (pDesc + ' ' + nums[1]).replace(/\s+/g, ' '), nums[2], outrosDebitos); pDate = null; pDesc = '' }
        else pDesc += ' ' + line
      }
    }

    // ── Comissões pendentes ───────────────────────────────────────────────────
    if (section === 'pendentes') {
      const full = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})(?:\s+(Parcela\s+\S+(?:\s+\S+)*))?$/)
      if (full) {
        pDate = null; pDesc = ''
        pendentes.push({ dataVcto: parseDateBR(full[1]), descricao: full[2].trim(), valorParcela: parseBR(full[3]), baseComissao: parseBR(full[4]), valorComissao: parseBR(full[5]), situacao: full[6]?.trim() || '', ref: extractRef(full[2]) })
        continue
      }
      if (dateMatch) { pDate = dateMatch[1]; pDesc = line.slice(dateMatch[0].length).trim(); continue }
      if (pDate) {
        const nums = line.match(/^(.*?)\s*([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})(?:\s+(Parcela\s+\S+(?:\s+\S+)*))?$/)
        if (nums) {
          const desc = (pDesc + ' ' + nums[1]).replace(/\s+/g, ' ').trim()
          pendentes.push({ dataVcto: parseDateBR(pDate), descricao: desc, valorParcela: parseBR(nums[2]), baseComissao: parseBR(nums[3]), valorComissao: parseBR(nums[4]), situacao: nums[5]?.trim() || '', ref: extractRef(desc) })
          pDate = null; pDesc = ''
        } else if (/^Parcela/i.test(line) && pendentes.length > 0) {
          pendentes[pendentes.length - 1].situacao = line.trim()
          pDate = null; pDesc = ''
        } else {
          pDesc += ' ' + line
        }
      }
    }
  }

  return { refMes: `${mes}/${ano}`, mes, ano, importId, saldoAnterior, comissoesMes, outrosDebitos, pendentes }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ImportadorNorthSails({ onClose, onDone }) {
  const [file, setFile]      = useState(null)
  const [parsed, setParsed]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]  = useState(false)
  const [error, setError]    = useState('')

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f); setParsed(null); setError('')
  }

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true); setError('')
    try {
      const text   = await extractTextFromPDF(file)
      const result = parseExtrato(text)

      const alreadyImported = readLocal('ts_contasReceber', []).some(c => c.importId === result.importId)
      if (alreadyImported) {
        setError(`Extrato ${result.refMes} já foi importado anteriormente.`)
        setLoading(false); return
      }

      setParsed(result)
    } catch (e) {
      setError(e.message || 'Erro ao processar o PDF.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!parsed) return
    setSaving(true); setError('')

    try {
      const allCats = readLocal('ts_categorias', [])
      const partes  = readLocal('ts_partes', [])

      const northSailsParte = partes.find(p => /north.?sails/i.test(p.nome))
      if (!northSailsParte) {
        setError('Parte Relacionada "North Sails" não encontrada em Gestão de Contas. Cadastre-a primeiro.')
        setSaving(false); return
      }

      const catParteRel = allCats.find(c => /parte.?relacionada/i.test(c.nome))?.id
      if (!catParteRel) {
        setError('Categoria "Parte Relacionada" não encontrada. Cadastre-a em Cadastros → Categorias.')
        setSaving(false); return
      }

      // Encontra ou cria categoria de comissão
      let catComissao = allCats.find(c => /comiss/i.test(c.nome))?.id
      if (!catComissao) {
        const newCat = { id: uuid(), nome: 'Comissão North Sails', tipo: 'receita' }
        await writeLocal('ts_categorias', [...allCats, newCat])
        catComissao = newCat.id
      }

      let contasReceber = readLocal('ts_contasReceber', [])
      let offBook       = readLocal('ts_offBook', [])

      const { importId, comissoesMes, outrosDebitos, pendentes } = parsed

      // ── Comissões do mês: CR confirmado + partida cruzada ──────────────────
      for (const row of comissoesMes) {
        const existing = row.ref
          ? contasReceber.find(c => c.northSailsRef === row.ref && c.status === 'aberto')
          : null

        const baixaCruzadaId = uuid()
        const crId = uuid(), dbId = uuid(), gcId = uuid()
        const contaId = existing?.id || uuid()

        offBook.push(
          { id: crId, descricao: row.descricao, categoriaId: catComissao,  parteId: null,                valor: row.valorComissao, tipo: 'receita', data: row.data, baixaCruzadaId, contaId },
          { id: dbId, descricao: `Repasse — ${northSailsParte.nome}`, categoriaId: catParteRel, parteId: null, valor: row.valorComissao, tipo: 'despesa', data: row.data, baixaCruzadaId, contaId },
          { id: gcId, descricao: row.descricao, categoriaId: catParteRel, parteId: northSailsParte.id,   valor: row.valorComissao, tipo: 'receita', data: row.data, baixaCruzadaId, contaId }
        )

        if (existing) {
          contasReceber = contasReceber.map(c =>
            c.id === existing.id
              ? { ...c, status: 'confirmado', formaPagamento: 'cruzado', lancIds: [crId, dbId, gcId] }
              : c
          )
        } else {
          contasReceber.push({
            id: contaId,
            status: 'confirmado',
            ordemId: null,
            lancIds: [crId, dbId, gcId],
            formaPagamento: 'cruzado',
            baixaCruzadaId: null,
            descricao: row.descricao,
            categoriaId: catComissao,
            valor: row.valorComissao,
            vencimento: row.data,
            northSailsRef: row.ref,
            importId,
          })
        }
      }

      // ── Outros débitos: despesa na Gestão de Contas (North Sails) ──────────
      for (const row of outrosDebitos) {
        offBook.push({
          id: uuid(),
          descricao: row.descricao,
          categoriaId: catParteRel,
          parteId: northSailsParte.id,
          valor: row.valor,
          tipo: 'despesa',
          data: row.data,
          baixaCruzadaId: null,
          contaId: null,
          importId,
        })
      }

      // ── Pendentes: CR aberto com vencimento ────────────────────────────────
      for (const row of pendentes) {
        if (row.ref && contasReceber.some(c => c.northSailsRef === row.ref && c.status === 'aberto')) continue
        contasReceber.push({
          id: uuid(),
          status: 'aberto',
          ordemId: null,
          lancIds: [],
          formaPagamento: null,
          baixaCruzadaId: null,
          descricao: row.descricao,
          categoriaId: catComissao,
          valor: row.valorComissao,
          vencimento: row.dataVcto,
          northSailsRef: row.ref,
          importId,
        })
      }

      await writeLocal('ts_contasReceber', contasReceber)
      await writeLocal('ts_offBook', offBook)

      onDone?.()
      onClose()
    } catch (e) {
      setError(e.message || 'Erro ao salvar os dados.')
    } finally {
      setSaving(false)
    }
  }

  const totalComissoes = parsed?.comissoesMes.reduce((s, r) => s + r.valorComissao, 0) || 0
  const totalDebitos   = parsed?.outrosDebitos.reduce((s, r) => s + r.valor, 0) || 0
  const totalPendentes = parsed?.pendentes.reduce((s, r) => s + r.valorComissao, 0) || 0

  return (
    <Modal title="Importar Extrato North Sails" onClose={onClose} size="xl">
      {/* ── Step 1: seleção do arquivo ─────────────────────────────────────── */}
      {!parsed && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <label className="erp-label">Arquivo PDF (Relatório de Comissões)</label>
            <input type="file" accept=".pdf" onChange={handleFileChange} className="erp-input" />
          </div>
          {error && (
            <div style={{ padding: '8px 10px', background: '#FDECEA', border: '1px solid #E8A09A', borderRadius: '2px', fontSize: '11px', color: '#C62828', marginBottom: '12px' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={onClose} className="erp-btn erp-btn-secondary">Cancelar</button>
            <button onClick={handleAnalyze} disabled={!file || loading} className="erp-btn erp-btn-primary">
              {loading ? 'Analisando...' : 'Analisar PDF'}
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: preview e confirmação ─────────────────────────────────── */}
      {parsed && (
        <>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '16px' }}>
            <div className="erp-stat credit">
              <div className="s-label">Comissões do mês ({parsed.comissoesMes.length})</div>
              <div className="s-value">{formatCurrency(totalComissoes)}</div>
            </div>
            <div className="erp-stat debit">
              <div className="s-label">Outros débitos ({parsed.outrosDebitos.length})</div>
              <div className="s-value">{formatCurrency(totalDebitos)}</div>
            </div>
            <div className="erp-stat">
              <div className="s-label">Pendentes ({parsed.pendentes.length})</div>
              <div className="s-value">{formatCurrency(totalPendentes)}</div>
            </div>
          </div>

          {/* Comissões do mês */}
          {parsed.comissoesMes.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2E7D32', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Comissões do mês → C. Receber (confirmado) + Gestão de Contas North Sails
              </div>
              <table className="erp-table" style={{ fontSize: '11px' }}>
                <thead><tr><th>Data crédito</th><th>Descrição</th><th className="right">Comissão</th></tr></thead>
                <tbody>
                  {parsed.comissoesMes.map((r, i) => (
                    <tr key={i}>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>{r.data}</td>
                      <td>{r.descricao}</td>
                      <td className="right credit">{formatCurrency(r.valorComissao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Outros débitos */}
          {parsed.outrosDebitos.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#C62828', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Outros débitos → Gestão de Contas North Sails (despesa)
              </div>
              <table className="erp-table" style={{ fontSize: '11px' }}>
                <thead><tr><th>Data</th><th>Descrição</th><th className="right">Valor</th></tr></thead>
                <tbody>
                  {parsed.outrosDebitos.map((r, i) => (
                    <tr key={i}>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>{r.data}</td>
                      <td>{r.descricao}</td>
                      <td className="right debit">{formatCurrency(r.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pendentes */}
          {parsed.pendentes.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0050A0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Pendentes → C. Receber (aberto)
              </div>
              <table className="erp-table" style={{ fontSize: '11px' }}>
                <thead><tr><th>Vencimento</th><th>Descrição</th><th className="right">Comissão</th><th>Situação</th></tr></thead>
                <tbody>
                  {parsed.pendentes.map((r, i) => (
                    <tr key={i}>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>{r.dataVcto}</td>
                      <td>{r.descricao}</td>
                      <td className="right credit">{formatCurrency(r.valorComissao)}</td>
                      <td style={{ fontSize: '10px', color: r.situacao?.toLowerCase().includes('atrasada') ? '#C62828' : '#54698D' }}>{r.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div style={{ padding: '8px 10px', background: '#FDECEA', border: '1px solid #E8A09A', borderRadius: '2px', fontSize: '11px', color: '#C62828', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '14px', borderTop: '1px solid #E4E7EA' }}>
            <button onClick={() => { setParsed(null); setError('') }} className="erp-btn erp-btn-secondary">← Voltar</button>
            <button onClick={handleConfirm} disabled={saving} className="erp-btn erp-btn-success">
              {saving ? 'Importando...' : `Confirmar Importação — ${parsed.refMes}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
