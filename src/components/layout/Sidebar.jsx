const navItems = [
  { id: 'dashboard',    label: 'Dashboard',         icon: '◈' },
  { id: 'cadastros',    label: 'Cadastros',        icon: '▤' },
  { id: 'pedidos',      label: 'Pedidos',            icon: '◳' },
  { id: 'ordens',       label: 'Ordens de Serviço', icon: '◈' },
  { id: 'financeiro',      label: 'Financeiro',        icon: '◉' },
  { id: 'gestaoFinanceira',label: 'Gestão Financeira', icon: '◎' },
  { id: 'gestaoContas',    label: 'Gestão de Contas',  icon: '◑' },
  { id: 'relatorios',      label: 'Relatórios',         icon: '◫' },
  { id: 'backup',          label: 'Backup',             icon: '◐' },
]

export default function Sidebar({ currentPage, onNavigate, onLogout, user, onCloseMobile }) {
  return (
    <aside style={{ width:'220px', minHeight:'100vh', background:'#1C2833', display:'flex', flexDirection:'column', flexShrink:0 }}>
      {/* Logo */}
      <div style={{ padding:'16px 18px 14px', borderBottom:'1px solid #263648' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'20px' }}>⚓</span>
            <div style={{ color:'#FFFFFF', fontSize:'13px', fontWeight:700, letterSpacing:'-0.01em' }}>TOP SAIL</div>
          </div>
          {onCloseMobile && (
            <button onClick={onCloseMobile} className="ts-sidebar-close" aria-label="Fechar menu">×</button>
          )}
        </div>
      </div>

      {/* Nav label */}
      <div style={{ padding:'12px 18px 4px' }}>
        <span style={{ fontSize:'10px', color:'#4A6278', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>
          Menu Principal
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex:1 }}>
        {navItems.map(item => {
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:'10px',
                padding:'8px 18px',
                fontSize:'12px', fontWeight: active ? 600 : 400,
                textAlign:'left', cursor:'pointer', border:'none',
                borderRight: active ? '3px solid #0070D2' : '3px solid transparent',
                background: active ? '#0F3759' : 'transparent',
                color: active ? '#FFFFFF' : '#9DAFC0',
                transition:'background .15s, color .15s',
                fontFamily:'inherit',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background='#223347'; e.currentTarget.style.color='#FFFFFF'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#9DAFC0'; } }}
            >
              <span style={{ fontSize:'14px', opacity: active ? 1 : 0.7, minWidth:'16px', textAlign:'center' }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Separator */}
      <div style={{ borderTop:'1px solid #263648', margin:'0 18px' }} />

      {/* User */}
      <div style={{ padding:'12px 18px 16px' }}>
        <div style={{ fontSize:'10px', color:'#4A6278', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>
          Sessão Ativa
        </div>
        <div style={{ color:'#C8D8E4', fontSize:'12px', fontWeight:500, marginBottom:'4px' }}>
          {user?.user_metadata?.nomeCompleto || user?.email}
        </div>
        {user?.user_metadata?.nomeCompleto && (
          <div style={{ color:'#4A6278', fontSize:'10px', marginBottom:'8px' }}>{user.email}</div>
        )}
        <button
          onClick={onLogout}
          style={{ fontSize:'11px', color:'#7F8C9A', background:'none', border:'1px solid #263648', borderRadius:'2px', padding:'3px 10px', cursor:'pointer', fontFamily:'inherit', transition:'background .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background='#263648'; e.currentTarget.style.color='#FFFFFF'; }}
          onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#7F8C9A'; }}
        >
          Sair do Sistema
        </button>
      </div>
    </aside>
  )
}
