import { useState } from 'react'
import LancamentosTab from './LancamentosTab'
import OffBook from './OffBook'
import ConsolidadoView from './ConsolidadoView'

const CONTAS = [
  { id:'consolidado', label:'Consolidado'    },
  { id:'fluxo',       label:'Bancos' },
  { id:'caixinha',    label:'Caixinha'        },
  { id:'offbook',     label:'Off Book'        },
]

export default function FluxoCaixaView() {
  const [conta, setConta] = useState('consolidado')

  const content = {
    consolidado: <ConsolidadoView key="consolidado" />,
    fluxo:       <LancamentosTab key="fluxo"    storageKey="ts_financeiro" title="Bancos" />,
    caixinha:    <LancamentosTab key="caixinha" storageKey="ts_caixinha"   title="Caixinha"        />,
    offbook:     <OffBook key="offbook" />,
  }

  return (
    <div>
      {/* Seletor de conta */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
        <span style={{ fontSize:'11px', fontWeight:700, color:'#54698D', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>
          Visualizar:
        </span>
        <div style={{ display:'flex', border:'1px solid #D8DDE6', borderRadius:'2px', overflow:'hidden' }}>
          {CONTAS.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setConta(c.id)}
              style={{
                padding:'5px 14px',
                fontSize:'12px',
                fontWeight: conta === c.id ? 700 : 400,
                background: conta === c.id ? '#0070D2' : '#fff',
                color:      conta === c.id ? '#fff'    : '#54698D',
                border: 'none',
                borderRight: idx < CONTAS.length - 1 ? '1px solid #D8DDE6' : 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background .15s, color .15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (conta !== c.id) { e.currentTarget.style.background='#F4F6F8'; e.currentTarget.style.color='#16191F' } }}
              onMouseLeave={e => { if (conta !== c.id) { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#54698D' } }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {content[conta]}
    </div>
  )
}
