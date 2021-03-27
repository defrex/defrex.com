export function humanizeDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  return Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
