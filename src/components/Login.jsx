import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (err) setError('E-mail ou senha incorretos.')
    setLoading(false)
    // onAuthStateChange em App.jsx atualiza o estado automaticamente
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background:'#F4F6F8' }}>
      <div style={{ width:'340px' }}>
        <div style={{ background:'#1C2833', padding:'28px 32px 24px', borderRadius:'2px 2px 0 0', textAlign:'center' }}>
          <div style={{ fontSize:'28px', marginBottom:'8px' }}>⚓</div>
          <div style={{ color:'#FFFFFF', fontSize:'16px', fontWeight:700, letterSpacing:'-0.01em' }}>Top Sails</div>
          <div style={{ color:'#7F8C9A', fontSize:'11px', marginTop:'3px', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Sistema de Gestão Náutica
          </div>
        </div>
        <div style={{ background:'#FFFFFF', border:'1px solid #D8DDE6', borderTop:'none', borderRadius:'0 0 2px 2px', padding:'24px 32px 28px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:'14px' }}>
              <label className="erp-label">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                className="erp-input"
                placeholder="seu@email.com"
                autoFocus
                required
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
                  required
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
            <button type="submit" disabled={loading} className="erp-btn erp-btn-primary" style={{ width:'100%', justifyContent:'center', padding:'8px', marginTop:'8px', fontSize:'13px' }}>
              {loading ? 'Entrando...' : 'Acessar o Sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
