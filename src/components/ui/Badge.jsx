const config = {
  aguardando:  { bg:'#FEF3CD', border:'#E0A000', color:'#5F4000', label:'Aguardando'  },
  emExecucao:  { bg:'#EAF3FB', border:'#A8C8E8', color:'#0050A0', label:'Em execução'  },
  pronto:      { bg:'#EFFFEF', border:'#88C088', color:'#1A5C1A', label:'Pronto'       },
  entregue:    { bg:'#F4F6F8', border:'#ADADAD', color:'#444444', label:'Entregue'     },
  aberto:      { bg:'#FEF3CD', border:'#E0A000', color:'#5F4000', label:'Em aberto'    },
  confirmado:  { bg:'#EFFFEF', border:'#88C088', color:'#1A5C1A', label:'Confirmado'   },
  estornado:   { bg:'#FDECEA', border:'#E89088', color:'#8B0000', label:'Estornado'    },
  receita:     { bg:'#EFFFEF', border:'#88C088', color:'#1A5C1A', label:'Crédito'      },
  despesa:     { bg:'#FDECEA', border:'#E89088', color:'#8B0000', label:'Débito'       },
  ambos:       { bg:'#F3EEF8', border:'#B89CC8', color:'#4A2080', label:'Ambos'        },
  pix:         { bg:'#EAF3FB', border:'#A8C8E8', color:'#0050A0', label:'PIX'          },
  dinheiro:    { bg:'#EFFFEF', border:'#88C088', color:'#1A5C1A', label:'Dinheiro'     },
  cruzado:     { bg:'#F3EEF8', border:'#B89CC8', color:'#4A2080', label:'Cruzado'            },
  // Pedidos
  pedAguardando: { bg:'#FEF3CD', border:'#E0A000', color:'#5F4000', label:'Aguardando'        },
  pedEnviado:    { bg:'#EAF3FB', border:'#A8C8E8', color:'#0050A0', label:'Enviado ao Cliente' },
  pedAprovado:   { bg:'#EFFFEF', border:'#88C088', color:'#1A5C1A', label:'Aprovado'           },
  pedRejeitado:  { bg:'#FDECEA', border:'#E89088', color:'#8B0000', label:'Rejeitado'          },
}

export default function Badge({ value, label }) {
  const c = config[value] || { bg:'#F4F6F8', border:'#ADADAD', color:'#444', label: value }
  const text = label || c.label
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 7px',
      fontSize: '11px',
      fontWeight: 600,
      borderRadius: '2px',
      border: `1px solid ${c.border}`,
      background: c.bg,
      color: c.color,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
      lineHeight: '1.6',
    }}>
      {text}
    </span>
  )
}
