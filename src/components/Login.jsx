import { useState } from 'react'
import { readLocal } from '../hooks/useLocalState'

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const users = readLocal('ts_usuarios', [])
    const found = users.find(u => u.usuario === usuario && u.senha === senha)
    if (found) { onLogin(found) }
    else { setError('Usuário ou senha incorretos.') }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background:'#F4F6F8' }}>
      <div style={{ width:'340px' }}>
        {/* Header */}
        <div style={{ background:'#1C2833', padding:'28px 32px 24px', borderRadius:'2px 2px 0 0', textAlign:'center' }}>
          <div style={{ fontSize:'28px', marginBottom:'8px' }}>⚓</div>
          <div style={{ color:'#FFFFFF', fontSize:'16px', fontWeight:700, letterSpacing:'-0.01em' }}>Top Sails</div>
          <div style={{ color:'#7F8C9A', fontSize:'11px', marginTop:'3px', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Sistema de Gestão Náutica
          </div>
        </div>

        {/* Form */}
        <div style={{ background:'#FFFFFF', border:'1px solid #D8DDE6', borderTop:'none', borderRadius:'0 0 2px 2px', padding:'24px 32px 28px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:'14px' }}>
              <label className="erp-label">Usuário</label>
              <input
                type="text"
                value={usuario}
                onChange={e => { setUsuario(e.target.value); setError('') }}
                className="erp-input"
                placeholder="Informe o usuário"
                autoFocus
              />
            </div>
            <div style={{ marginBottom:'6px' }}>
              <label className="erp-label">Senha</label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={senha}
                  onChange={e => { setSenha(e.target.value); setError('') }}
                  className="erp-input"
                  placeholder="Informe a senha"
                  style={{ paddingRight:'32px' }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#54698D', fontSize:'13px' }}>
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ color:'#C62828', fontSize:'11px', marginBottom:'10px', padding:'6px 8px', background:'#FDECEA', border:'1px solid #E8A09A', borderRadius:'2px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="erp-btn erp-btn-primary" style={{ width:'100%', justifyContent:'center', padding:'8px', marginTop:'8px', fontSize:'13px' }}>
              Acessar o Sistema
            </button>
          </form>

          <div style={{ marginTop:'16px', borderTop:'1px solid #F0F2F5', paddingTop:'12px', textAlign:'center' }}>
            <span style={{ fontSize:'11px', color:'#8A99A8' }}>
              Credencial padrão: admin / topsails2024
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
