export class RangeParseError extends Error {}

/**
 * Parses ranges like 1-3 7 12-15 against a 1-indexed page count into
 * 0-indexed positions preserving typed order and duplicates
 * Empty input means all pages
 * 5- means 5 through the end
 */
export function parseRanges(input: string, totalPages: number): number[] {
  const trimmed = input.trim()
  if (trimmed === '') {
    return Array.from({ length: totalPages }, (_, i) => i)
  }

  const indices: number[] = []
  for (const rawPart of trimmed.split(',')) {
    const part = rawPart.trim()
    if (part === '') continue

    const match = part.match(/^(\d+)(-(\d+)?)?$/)
    if (!match) {
      throw new RangeParseError('Invalid range')
    }

    const start = Number(match[1])
    const end = match[2] === undefined ? start : match[3] === undefined ? totalPages : Number(match[3])

    if (start < 1 || start > totalPages || end < 1 || end > totalPages || end < start) {
      throw new RangeParseError('Out of range')
    }

    for (let n = start; n <= end; n++) {
      indices.push(n - 1)
    }
  }
  return indices
}

/** Formats sorted 1-indexed positions into ranges like 1-3, 7, 12-15 */
export function formatRanges(positions: number[]): string {
  if (positions.length === 0) return ''
  const sorted = [...positions].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i <= sorted.length; i++) {
    const n = sorted[i]
    if (n === prev + 1) {
      prev = n
      continue
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`)
    if (n !== undefined) start = prev = n
  }
  return parts.join(', ')
}
