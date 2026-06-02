import { formatCurrency } from '../../utils/helpers'

// border = cor usada no drop-shadow (segue o contorno do clip-path)
const PALETTE = {
  orange: { bg:'#FEF3CD', text:'#5F4000', val:'#E65100', border:'#C88000' },
  blue:   { bg:'#EAF3FB', text:'#0050A0', val:'#0070D2', border:'#7AAED8' },
  green:  { bg:'#EFFFEF', text:'#1A5C1A', val:'#2E7D32', border:'#60A860' },
  gray:   { bg:'#F4F6F8', text:'#444444', val:'#54698D', border:'#9DAFC0' },
}

function getClipPath(idx, total) {
  const isFirst = idx === 0
  const isLast  = idx === total - 1
  if (isFirst)
    return 'polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%)'
  if (isLast)
    return 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 24px 50%)'
  return 'polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%, 24px 50%)'
}

/**
 * ChevronKPI — pipeline visual de status em formato de setas encadeadas.
 *
 * @param {Array}  stages    Array de { label, icon, count, valor, color }
 * @param {string} ariaLabel Descrição acessível do pipeline
 */
export default function ChevronKPI({ stages, ariaLabel = 'Pipeline de status' }) {
  const total = stages.reduce((s, st) => s + st.count, 0)

  return (
    <div
      className="chevron-kpi"
      role="list"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        width: '100%',
        // overflow visível: necessário para drop-shadow não ser clipado
        overflow: 'visible',
        minHeight: '60px',
      }}
    >
      {stages.map((stage, idx) => {
        const c       = PALETTE[stage.color] || PALETTE.gray
        const pct     = total > 0 ? Math.round(stage.count / total * 100) : 0
        const isFirst = idx === 0

        return (
          <div
            key={stage.label}
            role="listitem"
            aria-label={`${stage.label}: ${stage.count} — ${pct}% do total`}
            className="chevron-step"
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              background: c.bg,
              clipPath: getClipPath(idx, stages.length),
              marginLeft: isFirst ? 0 : -20,
              zIndex: stages.length - idx,
              paddingTop: 6,
              paddingBottom: 6,
              paddingLeft:  isFirst ? 16 : 36,
              paddingRight: 16,
              // Borda: drop-shadow acompanha o contorno do clip-path
              filter: `drop-shadow(0 0 2px ${c.border}) drop-shadow(0 0 1px ${c.border})`,
            }}
          >
            <span style={{ fontSize: '14px', lineHeight: 1, marginBottom: '2px' }}>
              {stage.icon}
            </span>
            <span style={{
              fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: c.text, marginBottom: '2px',
              whiteSpace: 'nowrap',
            }}>
              {stage.label}
            </span>
            <span style={{
              fontSize: '18px', fontWeight: 800, color: c.val,
              letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              {stage.count}
            </span>
            <span style={{ fontSize: '10px', color: c.text, opacity: 0.85, marginTop: '2px' }}>
              {formatCurrency(stage.valor)}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: c.val, marginTop: '1px' }}>
              {pct}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
