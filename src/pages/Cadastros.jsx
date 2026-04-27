import { useState } from 'react'
import { useLocalState, writeLocal, readLocal } from '../hooks/useLocalState'
import { supabase } from '../lib/supabaseClient'
import { uuid } from '../utils/helpers'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'

const TABS = [
  { id: 'categorias',   label: 'Cat. Receitas'        },
  { id: 'catDespesas',  label: 'Cat. Despesas'        },
  { id: 'clientes',     label: 'Clientes'             },
  { id: 'fornecedores', label: 'Fornecedores'         },
  { id: 'partes',       label: 'Partes Relacionadas'  },
  { id: 'usuarios',     label: 'Usuários'             },
]

function Toolbar({ title, onAdd, breadcrumb }) {
  return (
    <>
      <nav className="erp-bc">
        <span>Top Sails</span><span className="sep">/</span>
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
  const [open, setOpen]     = useState(false)
  const [form, setForm]     = useState({ nomeCompleto:'', email:'', senha:'' })
  const [showPwd, setShowPwd] = useState(false)
  const [status, setStatus] = useState(null) // { type:'ok'|'error'|'warn', text }
  const [saving, setSaving] = useState(false)

  const openNew = () => { setForm({ nomeCompleto:'', email:'', senha:'' }); setStatus(null); setShowPwd(false); setOpen(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: { data: { nomeCompleto: form.nomeCompleto } },
    })

    if (error) {
      setStatus({ type:'error', text: error.message })
      setSaving(false)
      return
    }

    // Salva perfil local para exibição na lista
    const novoPerfil = { id: data.user.id, email: form.email, nomeCompleto: form.nomeCompleto }
    await writeLocal('ts_perfis', [...readLocal('ts_perfis', []), novoPerfil])

    if (data.session) {
      // Confirmação de e-mail desativada no Supabase — novo usuário já entrou na sessão
      // Desconecta para que o admin faça login novamente
      setStatus({ type:'warn', text:`Usuário criado. Como a confirmação por e-mail está desativada, você será desconectado — faça login novamente.` })
      setTimeout(() => supabase.auth.signOut(), 3000)
    } else {
      setStatus({ type:'ok', text:`Convite enviado para ${form.email}. O usuário deverá confirmar o e-mail para acessar.` })
      setOpen(false)
    }
    setSaving(false)
  }

  return (
    <>
      <Toolbar title="Usuários do Sistema" breadcrumb="Usuários" onAdd={openNew} />

      {status && !open && (
        <div style={{ padding:'10px 14px', marginBottom:'12px', borderRadius:'2px', fontSize:'12px',
          background: status.type==='error' ? '#FDECEA' : status.type==='warn' ? '#FFF3CD' : '#E8F5E9',
          border: `1px solid ${status.type==='error' ? '#E8A09A' : status.type==='warn' ? '#FFCA28' : '#A5D6A7'}`,
          color: status.type==='error' ? '#C62828' : status.type==='warn' ? '#5F4000' : '#1B5E20' }}>
          {status.text}
        </div>
      )}

      <div style={{ marginBottom:'12px', padding:'10px 14px', background:'#EAF3FB', border:'1px solid #A8C8E8', borderRadius:'2px', fontSize:'11px', color:'#0050A0' }}>
        Para <strong>remover ou redefinir a senha</strong> de um usuário, acesse o painel do Supabase em Authentication → Users.
      </div>

      <div className="erp-panel">
        <table className="erp-table">
          <thead><tr>
            <th>Nome</th><th>E-mail</th>
          </tr></thead>
          <tbody>
            {perfis.length === 0 && <tr className="empty"><td colSpan={2}>Nenhum usuário registrado aqui ainda</td></tr>}
            {perfis.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight:500 }}>{p.nomeCompleto}</td>
                <td className="muted">{p.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Novo Usuário" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit}>
            <FField label="Nome Completo *">
              <input value={form.nomeCompleto} onChange={e => setForm(f => ({ ...f, nomeCompleto:e.target.value }))} required className="erp-input" />
            </FField>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <FField label="E-mail *">
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email:e.target.value }))} required className="erp-input" />
              </FField>
              <FField label="Senha Temporária *">
                <div style={{ position:'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} value={form.senha} minLength={6}
                    onChange={e => setForm(f => ({ ...f, senha:e.target.value }))} required className="erp-input" style={{ paddingRight:'30px' }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'#54698D' }}>
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </FField>
            </div>
            {status && (
              <div style={{ padding:'8px 10px', marginBottom:'10px', borderRadius:'2px', fontSize:'11px',
                background: status.type==='error' ? '#FDECEA' : '#FFF3CD',
                border: `1px solid ${status.type==='error' ? '#E8A09A' : '#FFCA28'}`,
                color: status.type==='error' ? '#C62828' : '#5F4000' }}>
                {status.text}
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px', paddingTop:'14px', borderTop:'1px solid #E4E7EA' }}>
              <button type="button" onClick={() => setOpen(false)} className="erp-btn erp-btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="erp-btn erp-btn-primary">
                {saving ? 'Criando...' : 'Criar Usuário'}
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

      {tab === 'categorias'  && <Categorias          />}
      {tab === 'catDespesas' && <CategoriasDespesas  />}
      {tab === 'clientes'    && <Clientes            />}
      {tab === 'fornecedores'&& <Fornecedores        />}
      {tab === 'partes'      && <PartesRelacionadas  />}
      {tab === 'usuarios'    && <Usuarios            />}
    </div>
  )
}
