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
//
// O Relatório de Comissões usa colunas de largura fixa. Em vez de "achatar" o
// PDF em texto (que perde a posição), preservamos a coordenada X de cada
// fragmento. Isso é essencial porque a descrição quebra em várias linhas
// enquanto a data e os valores ficam centralizados numa única linha do meio —
// reconstruir o registro exige saber a posição de cada pedaço.

async function extractFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise

  const pages = []   // [[{ y, cells: [{ x, text }] }, ...], ...]  uma lista por página, topo→base
  let text = ''
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()

    // Agrupa itens por coordenada Y (bucket de 4pt = mesma linha visual)
    const lineMap = new Map()
    for (const item of content.items) {
      if (!item.str?.trim()) continue
      const y = Math.round(item.transform[5] / 4) * 4
      if (!lineMap.has(y)) lineMap.set(y, [])
      lineMap.get(y).push({ x: Math.round(item.transform[4]), text: item.str })
    }

    // Ordena topo→base (maior y = mais acima na página, em coordenadas PDF)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a)
    const pageLines = []
    for (const y of sortedYs) {
      const cells = lineMap.get(y).sort((a, b) => a.x - b.x)
      pageLines.push({ y, cells })
      text += cells.map(c => c.text).join(' ').replace(/\s+/g, ' ').trim() + '\n'
    }
    pages.push(pageLines)
  }

  return { pages, text }
}

// ── Parser ────────────────────────────────────────────────────────────────────

// Limites de coluna (em pt) — o template North Sails é de largura fixa:
//   data x≈34 | descrição x≈109 | valores x≈347+ | situação (pendentes) x≈506
const DATE_RE  = /^\d{2}\/\d{2}\/\d{4}$/
const NUM_RE   = /^[\d.]+,\d{2}$/
const DESC_MIN = 100   // descrição começa em x≈109
const DESC_MAX = 340   // colunas numéricas começam em x≈347+
const SIT_MIN  = 490   // coluna "Situação" (pendentes) em x≈506

// Reconstrói os registros de uma seção. A data e os 3 valores estão sempre na
// mesma linha (a "âncora"); cada fragmento de descrição/situação é atribuído à
// âncora mais próxima verticalmente, juntando os pedaços quebrados em várias
// linhas. Agrupado por página para não comparar Y de páginas diferentes.
function buildRecords(lines) {
  const byPage = new Map()
  for (const l of lines) {
    if (!byPage.has(l.page)) byPage.set(l.page, [])
    byPage.get(l.page).push(l)
  }

  const records = []
  for (const [, pageLines] of byPage) {
    const anchors = []        // { y, date }
    const cells = []          // { y, x, text } — todos os fragmentos não-data
    for (const l of pageLines) {
      for (const c of l.cells) {
        if (c.x < DESC_MIN && DATE_RE.test(c.text)) anchors.push({ y: l.y, date: c.text })
        else cells.push({ y: l.y, x: c.x, text: c.text })
      }
    }
    if (!anchors.length) continue
    anchors.sort((a, b) => b.y - a.y)   // topo→base

    const nearest = (y) =>
      anchors.reduce((best, a) => (Math.abs(a.y - y) < Math.abs(best.y - y) ? a : best), anchors[0])

    const acc = new Map(anchors.map(a => [a, { desc: [], nums: [], sit: [] }]))
    for (const c of cells) {
      const g = acc.get(nearest(c.y))
      if (NUM_RE.test(c.text) && c.x >= DESC_MAX) g.nums.push(c)
      else if (c.x >= SIT_MIN)                    g.sit.push(c)
      else if (c.x >= DESC_MIN && c.x < DESC_MAX) g.desc.push(c)
    }

    const join = (arr) => arr
      .sort((p, q) => q.y - p.y || p.x - q.x)   // topo→base, esquerda→direita
      .map(c => c.text).join(' ').replace(/\s+/g, ' ').trim()

    for (const a of anchors) {
      const g = acc.get(a)
      records.push({
        date: a.date,
        descricao: join(g.desc),
        nums: g.nums.sort((p, q) => p.x - q.x).map(c => c.text),  // parcela, base, comissão
        situacao: join(g.sit),
      })
    }
  }
  return records
}

function parseExtrato(pages, text) {
  const headerMatch = text.match(/Relatório de Comissões\s*[-–]\s*(\d{2})\/(\d{4})/i)
  if (!headerMatch)
    throw new Error('Documento não reconhecido. Certifique-se de que é um Relatório de Comissões North Sails.')

  const mes = headerMatch[1]
  const ano = headerMatch[2]
  const importId = `northsails_${mes}_${ano}`

  const saldoMatch = text.match(/Saldo antes de[^\n]+?([\d.]+,\d{2})/)
  const saldoAnterior = saldoMatch ? parseBR(saldoMatch[1]) : 0

  // Distribui as linhas nas seções, coletando apenas a região de dados — entre
  // o cabeçalho de colunas ("Data ...") e a linha "Total de ..." — preservando
  // a página de cada linha.
  const buckets = { comissoes: [], debitos: [], pendentes: [] }
  let section = null
  let inData = false

  for (let p = 0; p < pages.length; p++) {
    for (const line of pages[p]) {
      const joined = line.cells.map(c => c.text).join(' ')

      if (/Comissões ainda pendentes/i.test(joined)) { section = 'pendentes'; inData = false; continue }
      if (/^\s*\(-\)\s*Outros débitos/i.test(joined)) { section = 'debitos';   inData = false; continue }
      if (/^\s*Comissões do mês/i.test(joined))       { section = 'comissoes'; inData = false; continue }
      if (/^\s*Resumo\s*$/i.test(joined))             { section = null;        inData = false; continue }
      if (/^\s*Total de/i.test(joined))               { inData = false; continue }
      if (!section) continue

      // Cabeçalho de colunas ("Data crédito/operação/vcto"): liga a coleta a
      // partir da PRÓXIMA linha e pula o próprio cabeçalho.
      if (line.cells.some(c => c.x < DESC_MIN && /^Data\s/i.test(c.text))) { inData = true; continue }
      if (!inData) continue

      buckets[section].push({ page: p, y: line.y, cells: line.cells })
    }
  }

  const comissoesMes = buildRecords(buckets.comissoes)
    .filter(r => r.nums.length >= 3)
    .map(r => ({
      data: parseDateBR(r.date),
      descricao: r.descricao,
      valorParcela: parseBR(r.nums[0]),
      baseComissao: parseBR(r.nums[1]),
      valorComissao: parseBR(r.nums[2]),
      ref: extractRef(r.descricao),
    }))

  const outrosDebitos = buildRecords(buckets.debitos)
    .filter(r => r.nums.length >= 1)
    .map(r => ({
      data: parseDateBR(r.date),
      descricao: r.descricao,
      valor: parseBR(r.nums[0]),
    }))

  const pendentes = buildRecords(buckets.pendentes)
    .filter(r => r.nums.length >= 3)
    .map(r => ({
      dataVcto: parseDateBR(r.date),
      descricao: r.descricao,
      valorParcela: parseBR(r.nums[0]),
      baseComissao: parseBR(r.nums[1]),
      valorComissao: parseBR(r.nums[2]),
      situacao: r.situacao,
      ref: extractRef(r.descricao),
    }))

  return { refMes: `${mes}/${ano}`, mes, ano, importId, saldoAnterior, comissoesMes, outrosDebitos, pendentes }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ImportadorNorthSails({ onClose, onDone }) {
  const [file, setFile]      = useState(null)
  const [parsed, setParsed]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]  = useState(false)
  const [error, setError]    = useState('')

  // Categoria das comissões do mês — pré-definida com a categoria "Comissões"
  const [comissaoCatId, setComissaoCatId] = useState(() => {
    const cats = readLocal('ts_categorias', [])
    return cats.find(c => c.nome?.trim().toLowerCase() === 'comissões')?.id
      || cats.find(c => /comiss/i.test(c.nome) && c.tipo !== 'despesa')?.id
      || ''
  })

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f); setParsed(null); setError('')
  }

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true); setError('')
    try {
      const { pages, text } = await extractFromPDF(file)
      const result = parseExtrato(pages, text)

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

      // Categoria das comissões escolhida no preview (default: "Comissões")
      const catComissao = comissaoCatId
      if (!catComissao) {
        setError('Selecione a categoria das comissões.')
        setSaving(false); return
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

  const receitaCats    = readLocal('ts_categorias', []).filter(c => c.tipo !== 'despesa')
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <label className="erp-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Categoria das comissões:</label>
                <select value={comissaoCatId} onChange={e => setComissaoCatId(e.target.value)} className="erp-select" style={{ maxWidth: '280px', fontSize: '11px' }}>
                  {receitaCats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
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
