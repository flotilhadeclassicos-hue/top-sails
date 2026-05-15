import { useState } from 'react'
import { useLocalState, writeLocal, readLocal } from '../hooks/useLocalState'
import { supabase } from '../lib/supabaseClient'
import { uuid } from '../utils/helpers'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'

const TABS = [
  { id: 'empresa',      label: 'Empresa'              },
  { id: 'categorias',   label: 'Cat. Receitas'        },
  { id: 'catDespesas',  label: 'Cat. Despesas'        },
  { id: 'clientes',     label: 'Clientes'             },
  { id: 'fornecedores', label: 'Fornecedores'         },
  { id: 'partes',       label: 'Partes Relacionadas'  },
  { id: 'produtos',     label: 'Produtos'             },
  { id: 'template',     label: 'Template PDF'         },
  { id: 'usuarios',     label: 'Usuários'             },
]

function Toolbar({ title, onAdd, breadcrumb }) {
  return (
    <>
      <nav className="erp-bc">
        <span>TOP SAIL</span><span className="sep">/</span>
        <span>Cadastros</span><span className="sep">/</span>
        <span className="cur">{breadcrumb}</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">{title}</h1>
        <button onClick={onAdd} className="erp-btn erp-btn-primary erp-btn-sm">+ Novo Registro</button>
      </div>
    </>
  )
}

function FField({ label, children }) {
  return <div style={{ marginBottom:'12px' }}><label className="erp-label">{label}</label>{children}</div>
}

function FormActions({ onCancel, editId }) {
  return (
    <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
      <button type="button" onClick={onCancel} className="erp-btn erp-btn-secondary">Cancelar</button>
      <button type="submit" className="erp-btn erp-btn-primary">{editId ? 'Salvar Alterações' : 'Cadastrar'}</button>
    </div>
  )
}

function SearchBar({ value, onChange, placeholder, children }) {
  return (
    <div className="erp-filter-row">
      <input value={value} onChange={onChange} placeholder={placeholder} className="erp-input" style={{ width:'260px' }} />
      {children}
    </div>
  )
}

// ── Empresa ───────────────────────────────────────────────────────────────────
const EMPRESA_VAZIA = {
  nome: '', cnpj: '', endereco: '', cidade: '', uf: '', cep: '',
  telefone: '', email: '', pix: '', banco: '', agencia: '', conta: '',
}

function Empresa() {
  const [empresa, setEmpresa] = useLocalState('ts_empresa', EMPRESA_VAZIA)
  const [form,    setForm]    = useState(() => ({ ...EMPRESA_VAZIA, ...empresa }))
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState(null)

  // Sincroniza form quando os dados chegam do Supabase
  const [carregado, setCarregado] = useState(false)
  if (!carregado && empresa && Object.keys(empresa).some(k => empresa[k])) {
    setForm({ ...EMPRESA_VAZIA, ...empresa })
    setCarregado(true)
  }

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      await writeLocal('ts_empresa', form)
      setMsg({ tipo:'ok', texto:'Dados da empresa salvos com sucesso.' })
    } catch {
      setMsg({ tipo:'erro', texto:'Erro ao salvar. Verifique a conexão.' })
    } finally { setSaving(false) }
  }

  const Input = ({ label, field, placeholder, col }) => (
    <div style={{ gridColumn: col, marginBottom:'12px' }}>
      <label className="erp-label">{label}</label>
      <input value={form[field]} onChange={e => set(field, e.target.value)}
        placeholder={placeholder} className="erp-input" />
    </div>
  )

  return (
    <>
      <nav className="erp-bc">
        <span>TOP SAIL</span><span className="sep">/</span>
        <span>Cadastros</span><span className="sep">/</span>
        <span className="cur">Empresa</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">Dados da Empresa</h1>
      </div>

      <form onSubmit={handleSave}>
        {/* Identificação */}
        <div style={{ marginBottom:'6px', fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em' }}>Identificação</div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'0 16px' }}>
          <Input label="Razão Social / Nome" field="nome"     placeholder="TOP SAIL Náutica Ltda."       col="1" />
          <Input label="CNPJ"                field="cnpj"     placeholder="00.000.000/0001-00"            col="2" />
        </div>

        {/* Endereço */}
        <div style={{ marginBottom:'6px', marginTop:'4px', fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em' }}>Endereço</div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:'0 16px' }}>
          <Input label="Logradouro"  field="endereco" placeholder="Rua das Embarcações, 123" col="1" />
          <Input label="Cidade"      field="cidade"   placeholder="São Paulo"                col="2" />
          <Input label="UF"          field="uf"       placeholder="SP"                       col="3" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'0 16px' }}>
          <Input label="CEP" field="cep" placeholder="00000-000" col="1" />
        </div>

        {/* Contato */}
        <div style={{ marginBottom:'6px', marginTop:'4px', fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em' }}>Contato</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
          <Input label="Telefone" field="telefone" placeholder="(00) 00000-0000"       col="1" />
          <Input label="E-mail"   field="email"    placeholder="contato@empresa.com.br" col="2" />
        </div>

        {/* Dados bancários */}
        <div style={{ marginBottom:'6px', marginTop:'4px', fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em' }}>Dados Bancários</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 16px' }}>
          <Input label="PIX"     field="pix"     placeholder="Chave PIX (e-mail, CPF, CNPJ ou telefone)" col="1 / -1" />
          <Input label="Banco"   field="banco"   placeholder="Ex: Banco do Brasil"   col="1" />
          <Input label="Agência" field="agencia" placeholder="0001-1"                col="2" />
          <Input label="Conta"   field="conta"   placeholder="00000-0"               col="3" />
        </div>

        {/* Ações */}
        {msg && (
          <div style={{
            padding:'8px 12px', marginBottom:'12px', borderRadius:'2px', fontSize:'12px',
            background: msg.tipo==='ok' ? '#E8F5E9' : '#FDECEA',
            border: `1px solid ${msg.tipo==='ok' ? '#A5D6A7' : '#E8A09A'}`,
            color: msg.tipo==='ok' ? '#1B5E20' : '#C62828',
          }}>
            {msg.texto}
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
          <button type="submit" disabled={saving} className="erp-btn erp-btn-primary">
            {saving ? 'Salvando...' : 'Salvar Dados da Empresa'}
          </button>
        </div>
      </form>
    </>
  )
}

// ── Categorias ────────────────────────────────────────────────────────────────
function Categorias() {
  const [allCats, setAllCats] = useLocalState('ts_categorias', [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nome:'', observacao:'' })
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')

  // Somente categorias de receita
  const items = allCats.filter(c => c.tipo === 'receita' || c.tipo === 'ambos')

  const openNew  = () => { setForm({ nome:'', observacao:'' }); setEditId(null); setOpen(true) }
  const openEdit = (i) => { setForm({ nome:i.nome, observacao:i.observacao||'' }); setEditId(i.id); setOpen(true) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    if (editId) {
      setAllCats(prev => prev.map(c => c.id === editId ? { ...c, nome:form.nome, observacao:form.observacao } : c))
    } else {
      setAllCats(prev => [...prev, { id:uuid(), nome:form.nome, tipo:'receita', observacao:form.observacao }])
    }
    setOpen(false)
  }

  const filtered = items.filter(i =>
    !search || i.nome.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Toolbar title="Categorias de Receitas" breadcrumb="Cat. Receitas" onAdd={openNew} />
      <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome..." />
      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th>Nome</th>
            <th style={{ width:'110px' }}>Tipo</th>
            <th>Observação</th>
            <th style={{ width:'100px' }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr className="empty"><td colSpan={4}>Nenhuma categoria de receita encontrada</td></tr>}
            {filtered.map(i => (
              <tr key={i.id}>
                <td style={{ fontWeight:500 }}>{i.nome}</td>
                <td><Badge value={i.tipo} /></td>
                <td className="muted">{i.observacao || '—'}</td>
                <td className="right">
                  <span style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
                    <button onClick={() => openEdit(i)} className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                    <button onClick={() => setAllCats(prev => prev.filter(c => c.id !== i.id))} className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editId ? 'Editar Categoria de Receita' : 'Nova Categoria de Receita'} onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit}>
            <FField label="Nome *">
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome:e.target.value }))} required className="erp-input" placeholder="Nome da categoria" />
            </FField>
            <FField label="Observação">
              <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao:e.target.value }))} rows={2} className="erp-textarea" placeholder="Informação adicional (opcional)" />
            </FField>
            <div style={{ background:'#EFFFEF', border:'1px solid #88C088', borderRadius:'2px', padding:'7px 10px', fontSize:'11px', color:'#1A5C1A', marginTop:'8px' }}>
              Esta categoria será criada com tipo <strong>Crédito (Receita)</strong> e ficará disponível em Contas a Receber, Ordens e Fluxo de Caixa.
            </div>
            <FormActions onCancel={() => setOpen(false)} editId={editId} />
          </form>
        </Modal>
      )}
    </>
  )
}

// ── Clientes ─────────────────────────────────────────────────────────────────
const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const EMPTY_CLIENTE = { nome:'', cpf:'', telefone:'', email:'', cep:'', logradouro:'', numero:'', complemento:'', bairro:'', cidade:'', uf:'' }

function clienteEndereco(i) {
  const parts = [i.logradouro, i.numero, i.complemento, i.bairro].filter(Boolean)
  const linha1 = parts.join(', ')
  const linha2 = [i.cidade, i.uf].filter(Boolean).join(' — ')
  return { linha1, linha2 }
}

function Clientes() {
  const [items, setItems] = useLocalState('ts_clientes', [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_CLIENTE)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const openNew  = () => { setForm(EMPTY_CLIENTE); setEditId(null); setCepError(''); setOpen(true) }
  const openEdit = (i) => {
    setForm({ ...EMPTY_CLIENTE, nome:i.nome, cpf:i.cpf||'', telefone:i.telefone||'', email:i.email||'',
      cep:i.cep||'', logradouro:i.logradouro||'', numero:i.numero||'',
      complemento:i.complemento||'', bairro:i.bairro||'', cidade:i.cidade||'', uf:i.uf||'' })
    setEditId(i.id); setCepError(''); setOpen(true)
  }

  const buscarCEP = async () => {
    const clean = form.cep.replace(/\D/g, '')
    if (clean.length !== 8) { setCepError('CEP inválido (8 dígitos)'); return }
    setCepLoading(true); setCepError('')
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (data.erro) { setCepError('CEP não encontrado.') }
      else {
        setForm(f => ({ ...f,
          logradouro: data.logradouro || f.logradouro,
          bairro:     data.bairro     || f.bairro,
          cidade:     data.localidade || f.cidade,
          uf:         data.uf         || f.uf,
        }))
      }
    } catch { setCepError('Erro ao consultar CEP.') }
    finally  { setCepLoading(false) }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    editId
      ? setItems(prev => prev.map(i => i.id === editId ? { ...i, ...form } : i))
      : setItems(prev => [...prev, { id:uuid(), ...form }])
    setOpen(false)
  }

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    return !q ||
      i.nome?.toLowerCase().includes(q) ||
      i.cpf?.includes(q) ||
      i.cidade?.toLowerCase().includes(q) ||
      i.cep?.includes(q)
  })

  return (
    <>
      <Toolbar title="Clientes" breadcrumb="Clientes" onAdd={openNew} />
      <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, CPF ou cidade..." />
      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th>Nome</th><th>CPF</th><th>Telefone</th><th>E-mail</th><th>Endereço</th><th style={{ width:'100px' }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr className="empty"><td colSpan={6}>Nenhum cliente encontrado</td></tr>}
            {filtered.map(i => {
              const end = clienteEndereco(i)
              return (
                <tr key={i.id}>
                  <td style={{ fontWeight:500 }}>{i.nome}</td>
                  <td className="muted">{i.cpf || '—'}</td>
                  <td className="muted">{i.telefone || '—'}</td>
                  <td className="muted">{i.email || '—'}</td>
                  <td className="muted" style={{ fontSize:'11px', lineHeight:'1.5' }}>
                    {end.linha1 && <div>{end.linha1}</div>}
                    {end.linha2 && <div>{end.linha2}{i.cep ? ` · ${i.cep}` : ''}</div>}
                    {!end.linha1 && !end.linha2 && '—'}
                  </td>
                  <td className="right">
                    <span style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
                      <button onClick={() => openEdit(i)} className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                      <button onClick={() => setItems(p => p.filter(x => x.id !== i.id))} className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editId ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setOpen(false)} size="lg">
          <form onSubmit={handleSubmit}>
            {/* Dados pessoais */}
            <FField label="Nome completo *">
              <input value={form.nome} onChange={e => set('nome', e.target.value)} required className="erp-input" />
            </FField>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <FField label="CPF">
                <input value={form.cpf} onChange={e => set('cpf', e.target.value)} className="erp-input" placeholder="000.000.000-00" />
              </FField>
              <FField label="Telefone">
                <input value={form.telefone} onChange={e => set('telefone', e.target.value)} className="erp-input" placeholder="(00) 00000-0000" />
              </FField>
              <FField label="E-mail">
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="erp-input" />
              </FField>
            </div>

            {/* Endereço */}
            <div style={{ borderTop:'1px solid #E4E7EA', margin:'4px 0 14px', paddingTop:'12px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'12px' }}>
                Endereço
              </div>

              {/* CEP + busca */}
              <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:'12px', marginBottom:'12px' }}>
                <FField label="CEP">
                  <div style={{ display:'flex', gap:'6px' }}>
                    <input value={form.cep} onChange={e => { set('cep', e.target.value); setCepError('') }}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), buscarCEP())}
                      className="erp-input" placeholder="00000-000" maxLength={9} style={{ flex:1 }} />
                    <button type="button" onClick={buscarCEP} disabled={cepLoading}
                      className="erp-btn erp-btn-secondary erp-btn-sm" style={{ whiteSpace:'nowrap' }}>
                      {cepLoading ? '...' : 'Buscar'}
                    </button>
                  </div>
                  {cepError && <span style={{ fontSize:'11px', color:'#C62828', marginTop:'3px', display:'block' }}>{cepError}</span>}
                </FField>
                <FField label="Logradouro (Rua / Av.)">
                  <input value={form.logradouro} onChange={e => set('logradouro', e.target.value)} className="erp-input" placeholder="Rua, Avenida, etc." />
                </FField>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:'12px', marginBottom:'12px' }}>
                <FField label="Número">
                  <input value={form.numero} onChange={e => set('numero', e.target.value)} className="erp-input" placeholder="Nº" />
                </FField>
                <FField label="Complemento">
                  <input value={form.complemento} onChange={e => set('complemento', e.target.value)} className="erp-input" placeholder="Apto, Bloco, Sala..." />
                </FField>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 70px', gap:'12px' }}>
                <FField label="Bairro">
                  <input value={form.bairro} onChange={e => set('bairro', e.target.value)} className="erp-input" />
                </FField>
                <FField label="Cidade">
                  <input value={form.cidade} onChange={e => set('cidade', e.target.value)} className="erp-input" />
                </FField>
                <FField label="UF">
                  <select value={form.uf} onChange={e => set('uf', e.target.value)} className="erp-select">
                    <option value="">—</option>
                    {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </FField>
              </div>
            </div>

            <FormActions onCancel={() => setOpen(false)} editId={editId} />
          </form>
        </Modal>
      )}
    </>
  )
}

// ── Fornecedores ──────────────────────────────────────────────────────────────
function Fornecedores() {
  const [items, setItems] = useLocalState('ts_fornecedores', [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nome:'', cpfCnpj:'', telefone:'', email:'', observacao:'' })
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')

  const openNew  = () => { setForm({ nome:'', cpfCnpj:'', telefone:'', email:'', observacao:'' }); setEditId(null); setOpen(true) }
  const openEdit = (i) => { setForm({ nome:i.nome, cpfCnpj:i.cpfCnpj, telefone:i.telefone, email:i.email, observacao:i.observacao }); setEditId(i.id); setOpen(true) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    editId
      ? setItems(prev => prev.map(i => i.id === editId ? { ...i, ...form } : i))
      : setItems(prev => [...prev, { id:uuid(), ...form }])
    setOpen(false)
  }

  const filtered = items.filter(i => i.nome.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <Toolbar title="Fornecedores" breadcrumb="Fornecedores" onAdd={openNew} />
      <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome..." />
      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th>Nome / Razão Social</th><th>CPF / CNPJ</th><th>Telefone</th><th>E-mail</th><th style={{ width:'100px' }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr className="empty"><td colSpan={5}>Nenhum fornecedor encontrado</td></tr>}
            {filtered.map(i => (
              <tr key={i.id}>
                <td style={{ fontWeight:500 }}>{i.nome}</td>
                <td className="muted">{i.cpfCnpj || '—'}</td>
                <td className="muted">{i.telefone || '—'}</td>
                <td className="muted">{i.email || '—'}</td>
                <td className="right">
                  <span style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
                    <button onClick={() => openEdit(i)} className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                    <button onClick={() => setItems(p => p.filter(x => x.id !== i.id))} className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editId ? 'Editar Fornecedor' : 'Novo Fornecedor'} onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit}>
            <FField label="Nome / Razão Social *"><input value={form.nome} onChange={e => setForm(f => ({ ...f, nome:e.target.value }))} required className="erp-input" /></FField>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <FField label="CPF / CNPJ"><input value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj:e.target.value }))} className="erp-input" /></FField>
              <FField label="Telefone"><input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone:e.target.value }))} className="erp-input" /></FField>
            </div>
            <FField label="E-mail"><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email:e.target.value }))} className="erp-input" /></FField>
            <FField label="Observação"><textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao:e.target.value }))} className="erp-textarea" rows={2} /></FField>
            <FormActions onCancel={() => setOpen(false)} editId={editId} />
          </form>
        </Modal>
      )}
    </>
  )
}

// ── Usuários ──────────────────────────────────────────────────────────────────
function Usuarios() {
  const [perfis, setPerfis] = useLocalState('ts_perfis', [])

  // modal criar
  const [openNew, setOpenNew]   = useState(false)
  const [formNew, setFormNew]   = useState({ nomeCompleto:'', email:'', senha:'' })
  const [showPwdNew, setShowPwdNew] = useState(false)

  // modal editar
  const [editTarget, setEditTarget] = useState(null) // perfil sendo editado
  const [formEdit, setFormEdit]     = useState({ nomeCompleto:'', email:'', senha:'' })
  const [showPwdEdit, setShowPwdEdit] = useState(false)

  const [status, setStatus] = useState(null) // { type:'ok'|'error'|'warn', text }
  const [saving, setSaving] = useState(false)

  const handleOpenNew = () => { setFormNew({ nomeCompleto:'', email:'', senha:'' }); setStatus(null); setShowPwdNew(false); setOpenNew(true) }

  const handleOpenEdit = (p) => {
    setEditTarget(p)
    setFormEdit({ nomeCompleto: p.nomeCompleto, email: p.email, senha:'' })
    setShowPwdEdit(false)
    setStatus(null)
  }

  // ── Criar usuário ─────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)

    const { data, error } = await supabase.auth.signUp({
      email: formNew.email,
      password: formNew.senha,
      options: { data: { nomeCompleto: formNew.nomeCompleto } },
    })

    if (error) {
      setStatus({ type:'error', text: error.message })
      setSaving(false)
      return
    }

    const novoPerfil = { id: data.user.id, email: formNew.email, nomeCompleto: formNew.nomeCompleto }
    await writeLocal('ts_perfis', [...readLocal('ts_perfis', []), novoPerfil])

    if (data.session) {
      setStatus({ type:'warn', text:`Usuário criado. Como a confirmação por e-mail está desativada, você será desconectado — faça login novamente.` })
      setTimeout(() => supabase.auth.signOut(), 3000)
    } else {
      setStatus({ type:'ok', text:`Convite enviado para ${formNew.email}. O usuário deverá confirmar o e-mail para acessar.` })
      setOpenNew(false)
    }
    setSaving(false)
  }

  // ── Editar usuário (nome e/ou senha) via Edge Function ────────────────────
  const handleEdit = async (e) => {
    e.preventDefault()
    if (!formEdit.nomeCompleto.trim() && !formEdit.senha) return
    setSaving(true)
    setStatus(null)

    const body = { email: formEdit.email }
    if (formEdit.nomeCompleto.trim()) body.nomeCompleto = formEdit.nomeCompleto.trim()
    if (formEdit.senha)               body.password     = formEdit.senha

    const { data, error } = await supabase.functions.invoke('admin-update-user', { body })

    if (error || !data?.ok) {
      setStatus({ type:'error', text: data?.error || error?.message || 'Erro desconhecido' })
      setSaving(false)
      return
    }

    // atualiza kv_store local se nome mudou
    if (formEdit.nomeCompleto.trim()) {
      const lista = readLocal('ts_perfis', []).map(p =>
        p.id === editTarget.id ? { ...p, nomeCompleto: formEdit.nomeCompleto.trim() } : p
      )
      await writeLocal('ts_perfis', lista)
    }

    setEditTarget(null)
    setStatus({ type:'ok', text: 'Usuário atualizado com sucesso.' })
    setSaving(false)
  }

  const StatusBox = ({ s }) => s ? (
    <div style={{ padding:'8px 10px', marginBottom:'10px', borderRadius:'2px', fontSize:'11px',
      background: s.type==='error' ? '#FDECEA' : s.type==='warn' ? '#FFF3CD' : '#E8F5E9',
      border: `1px solid ${s.type==='error' ? '#E8A09A' : s.type==='warn' ? '#FFCA28' : '#A5D6A7'}`,
      color: s.type==='error' ? '#C62828' : s.type==='warn' ? '#5F4000' : '#1B5E20' }}>
      {s.text}
    </div>
  ) : null

  return (
    <>
      <Toolbar title="Usuários do Sistema" breadcrumb="Usuários" onAdd={handleOpenNew} />

      {status && !openNew && !editTarget && <StatusBox s={status} />}

      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th>Nome</th><th>E-mail</th><th style={{ width:60 }}></th>
          </tr></thead>
          <tbody>
            {perfis.length === 0 && <tr className="empty"><td colSpan={3}>Nenhum usuário registrado aqui ainda</td></tr>}
            {perfis.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight:500 }}>{p.nomeCompleto}</td>
                <td className="muted">{p.email}</td>
                <td>
                  <button onClick={() => handleOpenEdit(p)} className="erp-btn erp-btn-secondary"
                    style={{ padding:'3px 10px', fontSize:'11px' }}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Criar */}
      {openNew && (
        <Modal title="Novo Usuário" onClose={() => setOpenNew(false)}>
          <form onSubmit={handleCreate}>
            <FField label="Nome Completo *">
              <input value={formNew.nomeCompleto} onChange={e => setFormNew(f => ({ ...f, nomeCompleto:e.target.value }))} required className="erp-input" />
            </FField>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <FField label="E-mail *">
                <input type="email" value={formNew.email} onChange={e => setFormNew(f => ({ ...f, email:e.target.value }))} required className="erp-input" />
              </FField>
              <FField label="Senha Temporária *">
                <div style={{ position:'relative' }}>
                  <input type={showPwdNew ? 'text' : 'password'} value={formNew.senha} minLength={6}
                    onChange={e => setFormNew(f => ({ ...f, senha:e.target.value }))} required className="erp-input" style={{ paddingRight:'30px' }} />
                  <button type="button" onClick={() => setShowPwdNew(v => !v)}
                    style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'#54698D' }}>
                    {showPwdNew ? '🙈' : '👁️'}
                  </button>
                </div>
              </FField>
            </div>
            <StatusBox s={status} />
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
              <button type="button" onClick={() => setOpenNew(false)} className="erp-btn erp-btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="erp-btn erp-btn-primary">
                {saving ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Editar */}
      {editTarget && (
        <Modal title={`Editar — ${editTarget.email}`} onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <FField label="Nome Completo">
                <input value={formEdit.nomeCompleto} onChange={e => setFormEdit(f => ({ ...f, nomeCompleto:e.target.value }))}
                  className="erp-input" />
              </FField>
              <FField label="E-mail">
                <input type="email" value={formEdit.email} onChange={e => setFormEdit(f => ({ ...f, email:e.target.value }))}
                  required className="erp-input" />
              </FField>
            </div>
            <FField label="Nova Senha (deixe em branco para não alterar)">
              <div style={{ position:'relative' }}>
                <input type={showPwdEdit ? 'text' : 'password'} value={formEdit.senha} minLength={6}
                  onChange={e => setFormEdit(f => ({ ...f, senha:e.target.value }))}
                  className="erp-input" style={{ paddingRight:'30px' }} placeholder="mínimo 6 caracteres" />
                <button type="button" onClick={() => setShowPwdEdit(v => !v)}
                  style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'#54698D' }}>
                  {showPwdEdit ? '🙈' : '👁️'}
                </button>
              </div>
            </FField>
            <StatusBox s={status} />
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
              <button type="button" onClick={() => setEditTarget(null)} className="erp-btn erp-btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving || (!formEdit.nomeCompleto.trim() && !formEdit.senha)}
                className="erp-btn erp-btn-primary">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

// ── Categorias de Despesas ────────────────────────────────────────────────────
function CategoriasDespesas() {
  const [allCats, setAllCats] = useLocalState('ts_categorias', [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nome: '', observacao: '' })
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')

  // Somente categorias de despesa
  const items = allCats.filter(c => c.tipo === 'despesa' || c.tipo === 'ambos')

  const openNew  = () => { setForm({ nome:'', observacao:'' }); setEditId(null); setOpen(true) }
  const openEdit = (i) => { setForm({ nome:i.nome, observacao:i.observacao||'' }); setEditId(i.id); setOpen(true) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    if (editId) {
      setAllCats(prev => prev.map(c => c.id === editId ? { ...c, nome:form.nome, observacao:form.observacao } : c))
    } else {
      setAllCats(prev => [...prev, { id:uuid(), nome:form.nome, tipo:'despesa', observacao:form.observacao }])
    }
    setOpen(false)
  }

  const filtered = items.filter(i =>
    !search || i.nome.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Toolbar title="Categorias de Despesas" breadcrumb="Cat. de Despesas" onAdd={openNew} />
      <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome..." />
      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th>Nome</th>
            <th style={{ width:'110px' }}>Tipo</th>
            <th>Observação</th>
            <th style={{ width:'100px' }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr className="empty"><td colSpan={4}>Nenhuma categoria de despesa encontrada</td></tr>}
            {filtered.map(i => (
              <tr key={i.id}>
                <td style={{ fontWeight:500 }}>{i.nome}</td>
                <td><Badge value={i.tipo} /></td>
                <td className="muted">{i.observacao || '—'}</td>
                <td className="right">
                  <span style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
                    <button onClick={() => openEdit(i)} className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                    <button onClick={() => setAllCats(prev => prev.filter(c => c.id !== i.id))} className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editId ? 'Editar Categoria de Despesa' : 'Nova Categoria de Despesa'} onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit}>
            <FField label="Nome *">
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome:e.target.value }))} required className="erp-input" placeholder="Nome da categoria" />
            </FField>
            <FField label="Observação">
              <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao:e.target.value }))} rows={2} className="erp-textarea" placeholder="Informação adicional (opcional)" />
            </FField>
            <div style={{ background:'#FEF3CD', border:'1px solid #E0A000', borderRadius:'2px', padding:'7px 10px', fontSize:'11px', color:'#5F4000', marginTop:'8px' }}>
              Esta categoria será criada com tipo <strong>Débito (Despesa)</strong> e ficará disponível em Contas a Pagar e Fluxo de Caixa.
            </div>
            <FormActions onCancel={() => setOpen(false)} editId={editId} />
          </form>
        </Modal>
      )}
    </>
  )
}

// ── Partes Relacionadas ───────────────────────────────────────────────────────
const TIPO_PARTE = ['Pessoa', 'Empresa', 'Sócio', 'Outro']

function PartesRelacionadas() {
  const [items, setItems] = useLocalState('ts_partes', [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'Pessoa', telefone: '', observacao: '' })
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')

  const openNew  = () => { setForm({ nome:'', tipo:'Pessoa', telefone:'', observacao:'' }); setEditId(null); setOpen(true) }
  const openEdit = (i) => { setForm({ nome:i.nome, tipo:i.tipo, telefone:i.telefone||'', observacao:i.observacao||'' }); setEditId(i.id); setOpen(true) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    editId
      ? setItems(prev => prev.map(i => i.id === editId ? { ...i, ...form } : i))
      : setItems(prev => [...prev, { id:uuid(), ...form }])
    setOpen(false)
  }

  const filtered = items.filter(i =>
    !search ||
    i.nome.toLowerCase().includes(search.toLowerCase()) ||
    i.tipo?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Toolbar title="Partes Relacionadas" breadcrumb="Partes Relacionadas" onAdd={openNew} />
      <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou tipo..." />
      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th>Nome</th>
            <th style={{ width:'110px' }}>Tipo</th>
            <th style={{ width:'140px' }}>Telefone</th>
            <th>Observação</th>
            <th style={{ width:'100px' }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr className="empty"><td colSpan={5}>Nenhuma parte relacionada encontrada</td></tr>}
            {filtered.map(i => (
              <tr key={i.id}>
                <td style={{ fontWeight:500 }}>{i.nome}</td>
                <td className="muted">{i.tipo || '—'}</td>
                <td className="muted">{i.telefone || '—'}</td>
                <td className="muted">{i.observacao || '—'}</td>
                <td className="right">
                  <span style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
                    <button onClick={() => openEdit(i)} className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                    <button onClick={() => setItems(p => p.filter(x => x.id !== i.id))} className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editId ? 'Editar Parte Relacionada' : 'Nova Parte Relacionada'} onClose={() => setOpen(false)} size="sm">
          <form onSubmit={handleSubmit}>
            <FField label="Nome *">
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome:e.target.value }))} required className="erp-input" placeholder="Nome da parte relacionada" />
            </FField>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <FField label="Tipo">
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo:e.target.value }))} className="erp-select">
                  {TIPO_PARTE.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FField>
              <FField label="Telefone">
                <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone:e.target.value }))} className="erp-input" placeholder="(00) 00000-0000" />
              </FField>
            </div>
            <FField label="Observação">
              <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao:e.target.value }))} rows={2} className="erp-textarea" placeholder="Informação adicional (opcional)" />
            </FField>
            <FormActions onCancel={() => setOpen(false)} editId={editId} />
          </form>
        </Modal>
      )}
    </>
  )
}

// ── Produtos ──────────────────────────────────────────────────────────────────
function Produtos() {
  const [items, setItems] = useLocalState('ts_produtos', [])
  const [open,   setOpen]   = useState(false)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ nome:'', classificacao:'', tipo:'', fabricacao:'Revenda', valor:'' })

  const openNew  = () => { setForm({ nome:'', classificacao:'', tipo:'', fabricacao:'Revenda', valor:'' }); setEditId(null); setOpen(true) }
  const openEdit = (i) => { setForm({ nome:i.nome, classificacao:i.classificacao||'', tipo:i.tipo||'', fabricacao:i.fabricacao||'Revenda', valor:i.valor||'' }); setEditId(i.id); setOpen(true) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    const p = { ...form, valor: parseFloat(form.valor) || 0 }
    editId
      ? setItems(prev => prev.map(i => i.id === editId ? { ...i, ...p } : i))
      : setItems(prev => [...prev, { id:uuid(), ...p }])
    setOpen(false)
  }

  const filtered = items.filter(i =>
    !search ||
    i.nome.toLowerCase().includes(search.toLowerCase()) ||
    i.classificacao?.toLowerCase().includes(search.toLowerCase()) ||
    i.tipo?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Toolbar title="Produtos" breadcrumb="Produtos" onAdd={openNew} />
      <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, classificação ou tipo..." />

      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th>Nome</th>
            <th style={{ width:'140px' }}>Classificação</th>
            <th style={{ width:'120px' }}>Tipo</th>
            <th style={{ width:'100px' }}>Fabricação</th>
            <th className="right" style={{ width:'110px' }}>Valor</th>
            <th style={{ width:'100px' }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr className="empty"><td colSpan={6}>Nenhum produto encontrado</td></tr>}
            {filtered.map(i => (
              <tr key={i.id}>
                <td style={{ fontWeight:500 }}>{i.nome}</td>
                <td className="muted">{i.classificacao || '—'}</td>
                <td className="muted">{i.tipo || '—'}</td>
                <td className="muted">{i.fabricacao || '—'}</td>
                <td className="right" style={{ fontWeight:600 }}>
                  {i.valor ? `R$ ${Number(i.valor).toFixed(2).replace('.',',')}` : '—'}
                </td>
                <td className="right">
                  <span style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
                    <button onClick={() => openEdit(i)} className="erp-btn erp-btn-link erp-btn-sm">Editar</button>
                    <button onClick={() => setItems(p => p.filter(x => x.id !== i.id))} className="erp-btn erp-btn-link-danger erp-btn-sm">Excluir</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editId ? 'Editar Produto' : 'Novo Produto'} onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit}>
            <FField label="Nome *">
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome:e.target.value }))} required className="erp-input" placeholder="Nome do produto" />
            </FField>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <FField label="Classificação">
                <input value={form.classificacao} onChange={e => setForm(f => ({ ...f, classificacao:e.target.value }))} className="erp-input" placeholder="Ex: Náutico, Elétrico..." />
              </FField>
              <FField label="Tipo">
                <input value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo:e.target.value }))} className="erp-input" placeholder="Ex: Peça, Material..." />
              </FField>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <FField label="Fabricação">
                <select value={form.fabricacao} onChange={e => setForm(f => ({ ...f, fabricacao:e.target.value }))} className="erp-select">
                  <option value="Revenda">Revenda</option>
                  <option value="Própria">Própria</option>
                </select>
              </FField>
              <FField label="Valor (R$)">
                <input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor:e.target.value }))} className="erp-input" placeholder="0,00" />
              </FField>
            </div>
            <FormActions onCancel={() => setOpen(false)} editId={editId} />
          </form>
        </Modal>
      )}
    </>
  )
}

// ── Template PDF ──────────────────────────────────────────────────────────────
function TemplatePDF() {
  const [template, setTemplate] = useLocalState('ts_template_pedido', {})
  const [preview,  setPreview]  = useState(null)   // imagem recém-selecionada (ainda não salva)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)

  const imagemSalva = template?.imagem || null

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const allowed = ['image/png','image/jpeg','image/jpg','image/webp']
    if (!allowed.includes(file.type)) {
      setMsg({ tipo:'erro', texto:'Formato não suportado. Use PNG, JPG ou WebP. Para arquivos Word, exporte como imagem primeiro.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ tipo:'erro', texto:'Arquivo muito grande. Tamanho máximo: 5 MB.' })
      return
    }
    setMsg(null)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!preview) return
    setSaving(true); setMsg(null)
    try {
      await writeLocal('ts_template_pedido', { imagem: preview })
      setPreview(null)
      setMsg({ tipo:'ok', texto:'Template salvo com sucesso.' })
    } catch {
      setMsg({ tipo:'erro', texto:'Erro ao salvar. Verifique a conexão.' })
    } finally { setSaving(false) }
  }

  const handleRemove = async () => {
    setSaving(true); setMsg(null)
    try {
      await writeLocal('ts_template_pedido', {})
      setPreview(null)
      setMsg({ tipo:'ok', texto:'Template removido.' })
    } catch {
      setMsg({ tipo:'erro', texto:'Erro ao remover.' })
    } finally { setSaving(false) }
  }

  const imagem = preview || imagemSalva

  return (
    <>
      <nav className="erp-bc">
        <span>TOP SAIL</span><span className="sep">/</span>
        <span>Cadastros</span><span className="sep">/</span>
        <span className="cur">Template PDF</span>
      </nav>
      <div className="erp-toolbar">
        <h1 className="erp-page-title">Template do Pedido / Orçamento</h1>
      </div>

      {/* Instruções */}
      <div style={{ padding:'12px 14px', marginBottom:'16px', background:'#EAF3FB', border:'1px solid #A8C8E8', borderRadius:'2px', fontSize:'12px', color:'#0050A0', lineHeight:'1.7' }}>
        <strong>Como usar:</strong> importe a imagem que será usada como fundo do PDF do pedido.<br />
        Formatos aceitos: <strong>PNG, JPG, WebP</strong> (máx. 5 MB).<br />
        Para usar um modelo Word: abra no Word → <em>Arquivo → Exportar → Alterar tipo de arquivo → PNG</em> ou tire um print da página.
      </div>

      {/* Área de upload */}
      <div style={{ display:'flex', gap:'24px', alignItems:'flex-start', flexWrap:'wrap' }}>
        <div style={{ flex:'0 0 auto' }}>
          <label className="erp-label">Arquivo de imagem</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFile}
            style={{ display:'block', marginBottom:'12px', fontSize:'12px' }}
          />
          <div style={{ display:'flex', gap:'8px' }}>
            <button
              onClick={handleSave}
              disabled={!preview || saving}
              className="erp-btn erp-btn-primary erp-btn-sm"
            >
              {saving ? 'Salvando...' : 'Salvar template'}
            </button>
            {imagemSalva && (
              <button
                onClick={handleRemove}
                disabled={saving}
                className="erp-btn erp-btn-link-danger erp-btn-sm"
              >
                Remover template atual
              </button>
            )}
          </div>

          {msg && (
            <div style={{
              marginTop:'10px', padding:'8px 10px', borderRadius:'2px', fontSize:'11px',
              background: msg.tipo==='ok' ? '#E8F5E9' : '#FDECEA',
              border: `1px solid ${msg.tipo==='ok' ? '#A5D6A7' : '#E8A09A'}`,
              color: msg.tipo==='ok' ? '#1B5E20' : '#C62828',
            }}>
              {msg.texto}
            </div>
          )}

          {!imagemSalva && !preview && (
            <div style={{ marginTop:'12px', fontSize:'11px', color:'#8A99A8', fontStyle:'italic' }}>
              Nenhum template salvo. O PDF usará o layout padrão do sistema.
            </div>
          )}
        </div>

        {/* Preview */}
        {imagem && (
          <div style={{ flex:'1 1 300px' }}>
            <label className="erp-label">
              {preview ? 'Pré-visualização (não salvo ainda)' : 'Template atual salvo'}
            </label>
            <div style={{
              border: `2px dashed ${preview ? '#0070D2' : '#88C088'}`,
              borderRadius:'2px', padding:'8px', background:'#F9FBFC', display:'inline-block',
            }}>
              <img
                src={imagem}
                alt="Template PDF"
                style={{ display:'block', maxWidth:'420px', maxHeight:'550px', objectFit:'contain' }}
              />
            </div>
            {preview && (
              <div style={{ fontSize:'11px', color:'#0070D2', marginTop:'4px' }}>
                Clique em "Salvar template" para confirmar.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Cadastros() {
  const [tab, setTab] = useState('categorias')

  return (
    <div style={{ padding:'20px 24px' }}>
      <div className="erp-tabs" style={{ marginBottom:'16px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`erp-tab ${tab === t.id ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'empresa'     && <Empresa              />}
      {tab === 'categorias'  && <Categorias          />}
      {tab === 'catDespesas' && <CategoriasDespesas  />}
      {tab === 'clientes'    && <Clientes            />}
      {tab === 'fornecedores'&& <Fornecedores        />}
      {tab === 'partes'      && <PartesRelacionadas  />}
      {tab === 'produtos'    && <Produtos            />}
      {tab === 'template'    && <TemplatePDF         />}
      {tab === 'usuarios'    && <Usuarios            />}
    </div>
  )
}
