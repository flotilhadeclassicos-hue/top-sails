import Modal from './Modal'
import { formatDate, formatCurrency } from '../../utils/helpers'
import { readLocal } from '../../hooks/useLocalState'

function Row({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display:'flex', gap:'8px', padding:'7px 0', borderBottom:'1px solid #F0F2F5' }}>
      <span style={{ fontSize:'11px', color:'#54698D', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', minWidth:'110px', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:'13px', color:'#16191F' }}>{value}</span>
    </div>
  )
}

function LinkBtn({ children, onClick, className, title, style }) {
  return (
    <button
      onClick={onClick}
      className={className}
      title={title}
      style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:'#0070D2', fontWeight:500, fontSize:'inherit', fontFamily:'inherit', textDecoration:'underline', textDecorationStyle:'dotted', textUnderlineOffset:'2px', ...style }}
    >
      {children}
    </button>
  )
}

export { LinkBtn }

export default function ClienteModal({ cliente, onClose, onOpenPedido }) {
  if (!cliente) return null

  const endereco = [
    cliente.logradouro && `${cliente.logradouro}${cliente.numero ? ', ' + cliente.numero : ''}${cliente.complemento ? ' ' + cliente.complemento : ''}`,
    cliente.bairro,
    cliente.cidade && `${cliente.cidade}${cliente.uf ? ' — ' + cliente.uf : ''}`,
    cliente.cep && `CEP ${cliente.cep}`,
  ].filter(Boolean).join(' · ')

  const pedidos = readLocal('ts_pedidos', [])
    .filter(p => p.clienteId === cliente.id)
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''))

  return (
    <Modal title={`Cliente — ${cliente.nome}`} onClose={onClose} size="lg">
      <div style={{ padding:'4px 0' }}>
        <Row label="Nome"       value={cliente.nome} />
        <Row label="CPF"        value={cliente.cpf} />
        <Row label="Telefone"   value={cliente.telefone} />
        <Row label="E-mail"     value={cliente.email} />
        <Row label="Endereço"   value={endereco} />
        <Row label="Observação" value={cliente.observacao} />
      </div>

      {pedidos.length > 0 && (
        <div style={{ marginTop:'20px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' }}>
            Pedidos ({pedidos.length})
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr style={{ background:'#F4F6F9' }}>
                  <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:600, color:'#54698D', fontSize:'11px', whiteSpace:'nowrap' }}>Data</th>
                  <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:600, color:'#54698D', fontSize:'11px', whiteSpace:'nowrap' }}>Número</th>
                  <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:600, color:'#54698D', fontSize:'11px' }}>Descrição</th>
                  <th style={{ padding:'6px 10px', textAlign:'right', fontWeight:600, color:'#54698D', fontSize:'11px', whiteSpace:'nowrap' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map(p => (
                  <tr key={p.id} style={{ borderBottom:'1px solid #F0F2F5' }}>
                    <td style={{ padding:'6px 10px', color:'#54698D', whiteSpace:'nowrap' }}>{formatDate(p.data)}</td>
                    <td style={{ padding:'6px 10px', whiteSpace:'nowrap' }}>
                      {onOpenPedido
                        ? <button onClick={() => { onClose(); onOpenPedido(p) }}
                            style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:'#0070D2', fontFamily:'monospace', fontWeight:700, fontSize:'12px', textDecoration:'underline' }}>
                            {p.numero}
                          </button>
                        : <span style={{ fontFamily:'monospace', fontWeight:700, color:'#16191F' }}>{p.numero}</span>
                      }
                    </td>
                    <td style={{ padding:'6px 10px', color:'#54698D' }}>{p.observacoes || '—'}</td>
                    <td style={{ padding:'6px 10px', textAlign:'right', fontWeight:600, color:'#16191F', whiteSpace:'nowrap' }}>{formatCurrency(p.total || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'16px', paddingTop:'12px', borderTop:'1px solid #E4E7EA' }}>
        <button onClick={onClose} className="erp-btn erp-btn-secondary">Fechar</button>
      </div>
    </Modal>
  )
}
