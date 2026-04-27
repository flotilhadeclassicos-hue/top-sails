export default function Modal({ title, onClose, children, size = 'md' }) {
  const sizes = { sm:'max-w-sm', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.45)' }}>
      <div className={`bg-white w-full ${sizes[size]} max-h-[90vh] flex flex-col`}
        style={{ border:'1px solid #D8DDE6', borderRadius:'2px', boxShadow:'0 4px 24px rgba(0,0,0,0.18)' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#D8DDE6]"
          style={{ background:'#F0F2F5' }}>
          <h2 style={{ margin:0, fontSize:'13px', fontWeight:700, color:'#16191F', letterSpacing:'-0.01em' }}>{title}</h2>
          <button onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:'18px', color:'#54698D', lineHeight:1, padding:'2px 6px' }}
            className="hover:text-[#16191F]">×</button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmModal({ title, message, onConfirm, onClose, danger }) {
  return (
    <Modal title={title} onClose={onClose} size="sm">
      <p style={{ color:'#54698D', fontSize:'13px', marginBottom:'20px', lineHeight:'1.5' }}>{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="erp-btn erp-btn-secondary">Cancelar</button>
        <button onClick={() => { onConfirm(); onClose() }}
          className={`erp-btn ${danger ? 'erp-btn-danger' : 'erp-btn-primary'}`}>
          Confirmar
        </button>
      </div>
    </Modal>
  )
}
