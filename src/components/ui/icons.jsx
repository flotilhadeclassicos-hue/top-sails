// Ícones SVG (traço fino, herdam a cor via currentColor).
// Usados nos botões de ação das tabelas (Pedidos, Ordens).

const base = (size = 16) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
})

export function IconEdit({ size }) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function IconTrash({ size }) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

export function IconDownload({ size }) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

export function IconCheck({ size }) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export function IconPdf({ size }) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8.5 13h1a1.2 1.2 0 0 1 0 2.4h-1Zm0 0v4" />
      <path d="M13 13v4h.8a1.6 1.6 0 0 0 1.6-1.6v-.8A1.6 1.6 0 0 0 13.8 13Z" />
    </svg>
  )
}

export function IconPlus({ size }) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconUndo({ size }) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M3 7v6h6" />
      <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
    </svg>
  )
}

export function IconLink({ size }) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  )
}
