import Modal from './Modal'
import { formatDate } from '../../utils/helpers'

function Row({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display:'flex', gap:'8px', padding:'7px 0', borderBottom:'1px solid #F0F2F5' }}>
      <span style={{ fontSize:'11px', color:'#54698D', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', minWidth:'110px', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:'13px', color:'#16191F' }}>{value}</span>
    </div>
  )
}

function LinkBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:'#0070D2', fontWeight:500, fontSize:'inherit', fontFamily:'inherit', textDecoration:'underline', textDecorationStyle:'dotted', textUnderlineOffset:'2px' }}
    >
      {children}
    </button>
  )
}

export { LinkBtn }

export default function ClienteModal({ cliente, onClose }) {
  if (!cliente) return null

  const endereco = [
    cliente.logradouro && `${cliente.logradouro}${cliente.numero ? ', ' + cliente.numero : ''}${cliente.complemento ? ' ' + cliente.complemento : ''}`,
    cliente.bairro,
    cliente.cidade && `${cliente.cidade}${cliente.uf ? ' — ' + cliente.uf : ''}`,
    cliente.cep && `CEP ${cliente.cep}`,
  ].filter(Boolean).join(' · ')

  return (
    <Modal title={`Cliente — ${cliente.nome}`} onClose={onClose} size="sm">
      <div style={{ padding:'4px 0' }}>
        <Row label="Nome"      value={cliente.nome} />
        <Row label="CPF"       value={cliente.cpf} />
        <Row label="Telefone"  value={cliente.telefone} />
        <Row label="E-mail"    value={cliente.email} />
        <Row label="Endereço"  value={endereco} />
        <Row label="Observação" value={cliente.observacao} />
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'16px', paddingTop:'12px', borderTop:'1px solid #E4E7EA' }}>
        <button onClick={onClose} className="erp-btn erp-btn-secondary">Fechar</button>
      </div>
    </Modal>
  )
}
