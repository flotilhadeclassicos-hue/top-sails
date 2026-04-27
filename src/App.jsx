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
import { writeLocal, readLocal } from './hooks/useLocalState'
import { uuid } from './utils/helpers'

function initDefaults() {
  const users = readLocal('ts_usuarios', [])
  if (users.length === 0) {
    writeLocal('ts_usuarios', [{
      id: uuid(),
      nomeCompleto: 'Administrador',
      usuario: 'admin',
      senha: 'topsails2024',
    }])
  }
  const cats = readLocal('ts_categorias', [])
  if (cats.length === 0) {
    writeLocal('ts_categorias', [
      { id: uuid(), nome: 'Manutenção',     tipo: 'ambos'   },
      { id: uuid(), nome: 'Reparo',         tipo: 'receita' },
      { id: uuid(), nome: 'Vistoria',       tipo: 'receita' },
      { id: uuid(), nome: 'Material',       tipo: 'despesa' },
      { id: uuid(), nome: 'Serviço Terceiro', tipo: 'despesa' },
      { id: uuid(), nome: 'Acerto de Contas',  tipo: 'ambos'   },
      { id: uuid(), nome: 'Parte Relacionada', tipo: 'ambos'   },
    ])
  }
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const s = sessionStorage.getItem('ts_session')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })
  const [page, setPage] = useState('dashboard')

  useEffect(() => { initDefaults() }, [])

  const login = (u) => {
    sessionStorage.setItem('ts_session', JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    sessionStorage.removeItem('ts_session')
    setUser(null)
    setPage('cadastros')
  }

  if (!user) return <Login onLogin={login} />

  const pages = {
    dashboard:    <Dashboard />,
    cadastros:    <Cadastros />,
    ordens:       <Ordens />,
    pedidos:      <Pedidos />,
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
