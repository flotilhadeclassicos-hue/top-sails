import { useState, useEffect } from 'react'
import Login from './components/Login'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Cadastros from './pages/Cadastros'
import Ordens from './pages/Ordens'
import Pedidos from './pages/Pedidos'
import Financeiro from './pages/financeiro/Financeiro'
import GestaoFinanceira from './pages/GestaoFinanceira'
import GestaoContas from './pages/GestaoContas'
import Relatorios from './pages/Relatorios'
import { writeLocal, readLocal, reloadAll, clearCache } from './hooks/useLocalState'
import { supabase } from './lib/supabaseClient'
import { uuid } from './utils/helpers'

async function initDefaults() {
  try {
    const cats = readLocal('ts_categorias', [])
    if (cats.length === 0) {
      await writeLocal('ts_categorias', [
        { id: uuid(), nome: 'Manutenção',        tipo: 'ambos'   },
        { id: uuid(), nome: 'Reparo',            tipo: 'receita' },
        { id: uuid(), nome: 'Vistoria',          tipo: 'receita' },
        { id: uuid(), nome: 'Material',          tipo: 'despesa' },
        { id: uuid(), nome: 'Serviço Terceiro',  tipo: 'despesa' },
        { id: uuid(), nome: 'Acerto de Contas',  tipo: 'ambos'   },
        { id: uuid(), nome: 'Parte Relacionada', tipo: 'ambos'   },
      ])
    }
  } catch (e) {
    console.error('initDefaults falhou:', e)
  }
}

export default function App() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState('dashboard')

  useEffect(() => {
    // onAuthStateChange dispara INITIAL_SESSION na montagem — única fonte de verdade
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (session) {
          setUser(session.user)
          await reloadAll()
          await initDefaults()
        }
        setLoading(false)
      } else if (event === 'SIGNED_IN') {
        setUser(session.user)
        await reloadAll()
        await initDefaults()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        clearCache()
        setPage('dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const logout = () => supabase.auth.signOut()

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F4F6F8', flexDirection:'column', gap:'12px' }}>
        <span style={{ fontSize:'28px' }}>⚓</span>
        <span style={{ fontSize:'13px', color:'#54698D', fontWeight:500 }}>Carregando Top Sails...</span>
      </div>
    )
  }

  if (!user) return <Login />

  const pages = {
    dashboard:        <Dashboard />,
    cadastros:        <Cadastros />,
    ordens:           <Ordens />,
    pedidos:          <Pedidos />,
    financeiro:       <Financeiro />,
    gestaoFinanceira: <GestaoFinanceira />,
    gestaoContas:     <GestaoContas />,
    relatorios:       <Relatorios />,
  }

  return (
    <Layout currentPage={page} onNavigate={setPage} onLogout={logout} user={user}>
      {pages[page]}
    </Layout>
  )
}
