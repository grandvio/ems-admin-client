export function formatDateTime(value) {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 19)
}

export function formatDate(value) {
  if (!value) return '—'
  return String(value).slice(0, 10)
}

export function formatTs(value) {
  if (value === null || value === undefined || value === '') return '—'
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function display(value) {
  if (value === null || value === undefined || value === '') return '—'
  return value
}
