import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { writeLocal } from '../hooks/useLocalState'

const KEYS = [
  'ts_empresa', 'ts_clientes', 'ts_fornecedores', 'ts_partes', 'ts_perfis',
  'ts_produtos', 'ts_categorias', 'ts_ordens', 'ts_pedidos',
  'ts_contasReceber', 'ts_contasPagar', 'ts_financeiro', 'ts_caixinha',
  'ts_offBook', 'ts_template_pedido', 'ts_rel_config_v3',
  'ts_northSailsImports',
]

const VERSAO_BACKUP = '1.0'

async function exportarBackup(userEmail) {
  const { data, error } = await supabase.from('kv_store').select('*')
  if (error) throw new Error('Erro ao ler dados: ' + error.message)

  const dados = {}
  const rows = data || []
  KEYS.forEach(key => {
    const row = rows.find(r => r.key === key)
    dados[key] = row ? row.value : null
  })

  const backup = {
    meta: {
      versao: VERSAO_BACKUP,
      app: 'Top Sail',
      exportadoEm: new Date().toISOString(),
      usuario: userEmail || '',
    },
    dados,
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `topsail_backup_${new Date().toISOString().slice(0, 10)}.topsail`
  a.click()
  URL.revokeObjectURL(url)
}

async function restaurarBackup(file, onProgress) {
  const text = await file.text()
  let backup
  try {
    backup = JSON.parse(text)
  } catch {
    throw new Error('Arquivo inválido — não é um JSON válido.')
  }

  if (!backup.meta || !backup.dados) {
    throw new Error('Arquivo inválido — estrutura de backup não reconhecida.')
  }
  if (backup.meta.app !== 'Top Sail') {
    throw new Error('Arquivo inválido — este backup não é do Top Sail.')
  }

  const keysParaRestaurar = Object.keys(backup.dados).filter(k => KEYS.includes(k))
  let done = 0

  for (const key of keysParaRestaurar) {
    const value = backup.dados[key]
    if (value !== null && value !== undefined) {
      await writeLocal(key, value)
    }
    done++
    onProgress(Math.round((done / keysParaRestaurar.length) * 100))
  }
}

export default function Backup({ user }) {
  const [exportando, setExportando]     = useState(false)
  const [exportOk, setExportOk]         = useState(false)
  const [restaurando, setRestaurando]   = useState(false)
  const [progresso, setProgresso]       = useState(0)
  const [restaurOk, setRestaurOk]       = useState(false)
  const [erro, setErro]                 = useState(null)
  const [arquivoNome, setArquivoNome]   = useState(null)
  const [confirmar, setConfirmar]       = useState(false)
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null)

  async function handleExportar() {
    setExportando(true)
    setExportOk(false)
    setErro(null)
    try {
      await exportarBackup(user?.email)
      setExportOk(true)
      setTimeout(() => setExportOk(false), 4000)
    } catch (e) {
      setErro(e.message)
    } finally {
      setExportando(false)
    }
  }

  function handleArquivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivoNome(file.name)
    setArquivoSelecionado(file)
    setConfirmar(false)
    setRestaurOk(false)
    setErro(null)
    e.target.value = ''
  }

  async function handleRestaurar() {
    if (!arquivoSelecionado) return
    setRestaurando(true)
    setProgresso(0)
    setRestaurOk(false)
    setErro(null)
    setConfirmar(false)
    try {
      await restaurarBackup(arquivoSelecionado, setProgresso)
      setRestaurOk(true)
      setArquivoNome(null)
      setArquivoSelecionado(null)
    } catch (e) {
      setErro(e.message)
    } finally {
      setRestaurando(false)
    }
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: '680px' }}>
      <nav className="erp-bc">
        <span>TOP SAIL</span><span className="sep">/</span><span className="cur">Backup</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">Backup e Restauração</h1>
      </div>

      {erro && (
        <div style={{ background: '#FDECEA', border: '1px solid #E89088', borderRadius: '2px', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: '#8B0000' }}>
          ⚠ {erro}
        </div>
      )}

      {/* ── EXPORTAR ── */}
      <div className="erp-panel" style={{ padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#54698D', marginBottom: '8px' }}>
          Exportar Backup
        </div>
        <p style={{ fontSize: '12px', color: '#54698D', marginBottom: '16px', lineHeight: 1.6 }}>
          Gera um arquivo <strong>.topsail</strong> com todos os dados do sistema: clientes, fornecedores, ordens de serviço, pedidos, contas a pagar e receber, lançamentos financeiros e configurações.
        </p>
        <div style={{ fontSize: '11px', color: '#8A99A8', marginBottom: '16px', background: '#F4F6F8', borderRadius: '2px', padding: '8px 12px', lineHeight: 1.7 }}>
          <strong style={{ color: '#54698D' }}>Conteúdo do arquivo:</strong><br />
          Empresa · Clientes · Fornecedores · Partes · Perfis · Produtos · Categorias · Ordens de Serviço · Pedidos · Contas a Receber · Contas a Pagar · Financeiro (Bancos) · Caixinha · Off-Book · Template de Pedido · Config. Relatórios
        </div>
        <button
          onClick={handleExportar}
          disabled={exportando}
          style={{
            background: exportOk ? '#2E7D32' : '#0070D2',
            color: '#fff', border: 'none', borderRadius: '2px',
            padding: '8px 20px', fontSize: '12px', fontWeight: 600,
            cursor: exportando ? 'wait' : 'pointer', fontFamily: 'inherit',
            transition: 'background .2s',
          }}
        >
          {exportando ? '⏳ Exportando...' : exportOk ? '✓ Backup baixado!' : '⬇ Exportar Backup'}
        </button>
      </div>

      {/* ── RESTAURAR ── */}
      <div className="erp-panel" style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#54698D', marginBottom: '8px' }}>
          Restaurar Backup
        </div>
        <p style={{ fontSize: '12px', color: '#54698D', marginBottom: '16px', lineHeight: 1.6 }}>
          Selecione um arquivo <strong>.topsail</strong> gerado por esta aplicação. Os dados atuais serão <strong style={{ color: '#C62828' }}>substituídos</strong> pelos dados do backup.
        </p>

        <label style={{
          display: 'inline-block', background: '#F4F6F8', border: '1px solid #D8DDE6',
          borderRadius: '2px', padding: '7px 16px', fontSize: '12px', fontWeight: 600,
          color: '#16191F', cursor: 'pointer', marginBottom: '12px',
        }}>
          📂 Selecionar arquivo
          <input type="file" accept=".topsail,.json" onChange={handleArquivo} style={{ display: 'none' }} />
        </label>

        {arquivoNome && !restaurando && !restaurOk && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#16191F', marginBottom: '10px' }}>
              Arquivo selecionado: <strong>{arquivoNome}</strong>
            </div>
            {!confirmar ? (
              <button
                onClick={() => setConfirmar(true)}
                style={{
                  background: '#E65100', color: '#fff', border: 'none', borderRadius: '2px',
                  padding: '8px 20px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ⚠ Restaurar dados
              </button>
            ) : (
              <div style={{ background: '#FEF3CD', border: '1px solid #E0A000', borderRadius: '2px', padding: '12px 16px' }}>
                <div style={{ fontSize: '12px', color: '#5F4000', marginBottom: '10px', fontWeight: 600 }}>
                  Confirma? Os dados atuais serão substituídos e essa ação não pode ser desfeita.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleRestaurar}
                    style={{
                      background: '#C62828', color: '#fff', border: 'none', borderRadius: '2px',
                      padding: '6px 16px', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Sim, restaurar
                  </button>
                  <button
                    onClick={() => { setConfirmar(false); setArquivoNome(null); setArquivoSelecionado(null) }}
                    style={{
                      background: 'none', color: '#54698D', border: '1px solid #D8DDE6', borderRadius: '2px',
                      padding: '6px 16px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {restaurando && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#54698D', marginBottom: '6px' }}>
              Restaurando... {progresso}%
            </div>
            <div style={{ background: '#D8DDE6', borderRadius: '2px', height: '6px', overflow: 'hidden' }}>
              <div style={{
                background: '#0070D2', height: '100%', borderRadius: '2px',
                width: `${progresso}%`, transition: 'width .2s',
              }} />
            </div>
          </div>
        )}

        {restaurOk && (
          <div style={{ background: '#EFFFEF', border: '1px solid #88C088', borderRadius: '2px', padding: '10px 14px', fontSize: '12px', color: '#1A5C1A' }}>
            ✓ Backup restaurado com sucesso! Recarregue a página para ver os dados atualizados.
          </div>
        )}
      </div>
    </div>
  )
}
