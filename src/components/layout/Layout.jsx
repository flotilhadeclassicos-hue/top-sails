import Sidebar from './Sidebar'

export default function Layout({ children, currentPage, onNavigate, onLogout, user }) {
  return (
    <div style={{ display:'flex', width:'100%', minHeight:'100vh' }}>
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} user={user} />
      <main style={{ flex:1, overflow:'auto', background:'#F4F6F8', minWidth:0 }}>
        {children}
      </main>
    </div>
  )
}
