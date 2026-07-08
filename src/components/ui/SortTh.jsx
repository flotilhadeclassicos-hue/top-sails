// Cabeçalho de coluna ordenável para tabelas erp-table.
// Uso: <SortTh col="valor" label="Valor" sort={sort} onSort={onSort} align="right" style={{width:110}} />
export default function SortTh({ col, label, sort, onSort, align, style, className }) {
  const active = sort?.key === col
  const arrow  = active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'
  return (
    <th
      onClick={() => onSort(col)}
      className={className}
      style={{ ...style, cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' }}
      title="Clique para ordenar"
    >
      <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', width:'100%' }}>
        {label}
        <span style={{ fontSize:'9px', lineHeight:1, color: active ? '#0070D2' : '#B4BDC7' }}>{arrow}</span>
      </span>
    </th>
  )
}

// Hook de estado + ordenação. getValue(row, key) devolve o valor comparável.
import { useState, useMemo } from 'react'
export function useSortable(items, initial, getValue) {
  const [sort, setSort] = useState(initial) // { key, dir:'asc'|'desc' }
  const onSort = (key) =>
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })

  const sorted = useMemo(() => {
    const arr = [...items]
    arr.sort((a, b) => {
      let va = getValue(a, sort.key), vb = getValue(b, sort.key)
      if (va == null) va = ''
      if (vb == null) vb = ''
      let cmp
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb
      else cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' })
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [items, sort, getValue])

  return { sorted, sort, onSort }
}
