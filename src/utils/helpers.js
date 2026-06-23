export const uuid = () => crypto.randomUUID()

export const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

export const formatCurrencyInt = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0)

// Apenas o número, sem "R$" e sem casas decimais (ex.: 4910 → "4.910")
export const formatNumberInt = (value) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value || 0)

export const addDays = (dateStr, days) => {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + Number(days))
  return d.toISOString().split('T')[0]
}

export const today = () => new Date().toISOString().split('T')[0]

export const currentYear = () => new Date().getFullYear()

export const generateOSNumber = (ordens) => {
  const year = currentYear()
  const thisYear = ordens.filter(o => o.numero?.startsWith(`OS-${year}-`))
  const seq = thisYear.length + 1
  return `OS-${year}-${String(seq).padStart(4, '0')}`
}

export const getMonthKey = (dateStr) => {
  if (!dateStr) return ''
  return dateStr.substring(0, 7)
}

export const monthLabel = (key) => {
  if (!key) return ''
  const [y, m] = key.split('-')
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${names[parseInt(m, 10) - 1]}/${y}`
}

export const currentMonthKey = () => today().substring(0, 7)

export const generatePedidoNumber = (pedidos) => {
  const year = currentYear()
  const thisYear = pedidos.filter(p => p.numero?.startsWith(`PE-${year}-`))
  return `PE-${year}-${String(thisYear.length + 1).padStart(4, '0')}`
}
