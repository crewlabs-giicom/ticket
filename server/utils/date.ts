/** Current date in WIB as YYYY-MM-DD */
export function todayWIB(): string {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Jakarta' })
}

/** N days ago in WIB as YYYY-MM-DD */
export function daysAgoWIB(n: number): string {
  return new Date(Date.now() - n * 86400000).toLocaleDateString('sv', { timeZone: 'Asia/Jakarta' })
}
