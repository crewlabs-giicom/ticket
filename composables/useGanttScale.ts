/**
 * Converts a date into a pixel offset within the Gantt grid, given the column list.
 *
 * Each column represents one grid "bucket" (a week or a month), and columns are NOT
 * a fixed number of days apart — a week bucket spans 7 days, a month bucket spans
 * 28-31 days. Positioning must interpolate against the actual bucket the date falls
 * into rather than assuming a flat "N ms per pixel" ratio (which only holds if a
 * bucket were exactly 1 day wide).
 */
export function dateToOffsetPx(date: Date, columns: { date: Date }[], colWidth: number): number {
  if (!columns.length) return 0
  const t = date.getTime()
  const n = columns.length

  // Find the bucket i whose start is the last one at-or-before t (extrapolates past the ends).
  let i = 0
  while (i < n - 1 && columns[i + 1].date.getTime() <= t) i++

  const curStart = columns[i].date.getTime()
  const intervalMs = i + 1 < n
    ? columns[i + 1].date.getTime() - curStart
    : (i > 0 ? curStart - columns[i - 1].date.getTime() : 7 * 86400000)

  const frac = (t - curStart) / intervalMs
  return (i + frac) * colWidth
}
