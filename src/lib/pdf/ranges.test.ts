import { describe, expect, it } from 'vitest'
import { formatRanges, parseRanges, RangeParseError } from './ranges'

describe('parseRanges', () => {
  it('empty input means all pages', () => {
    expect(parseRanges('', 5)).toEqual([0, 1, 2, 3, 4])
    expect(parseRanges('   ', 5)).toEqual([0, 1, 2, 3, 4])
  })

  it('parses a single page', () => {
    expect(parseRanges('3', 5)).toEqual([2])
  })

  it('parses a range', () => {
    expect(parseRanges('1-3', 5)).toEqual([0, 1, 2])
  })

  it('preserves typed order, not sorted order', () => {
    expect(parseRanges('7, 1-3', 10)).toEqual([6, 0, 1, 2])
  })

  it('allows duplicates', () => {
    expect(parseRanges('1, 1', 5)).toEqual([0, 0])
  })

  it('treats an open-ended range as "through the end"', () => {
    expect(parseRanges('5-', 8)).toEqual([4, 5, 6, 7])
  })

  it('combines ranges and singles', () => {
    expect(parseRanges('1-3, 7, 12-15', 20)).toEqual([0, 1, 2, 6, 11, 12, 13, 14])
  })

  it('rejects out-of-range numbers rather than clamping', () => {
    expect(() => parseRanges('99', 5)).toThrow(RangeParseError)
    expect(() => parseRanges('0', 5)).toThrow(RangeParseError)
    expect(() => parseRanges('3-99', 5)).toThrow(RangeParseError)
  })

  it('rejects malformed syntax', () => {
    expect(() => parseRanges('abc', 5)).toThrow(RangeParseError)
    expect(() => parseRanges('3-1', 5)).toThrow(RangeParseError)
  })
})

describe('formatRanges', () => {
  it('formats empty input as empty string', () => {
    expect(formatRanges([])).toBe('')
  })

  it('formats singles', () => {
    expect(formatRanges([1, 7])).toBe('1, 7')
  })

  it('collapses a consecutive run', () => {
    expect(formatRanges([1, 2, 3])).toBe('1-3')
  })

  it('sorts and mixes runs and singles', () => {
    expect(formatRanges([7, 1, 2, 3, 12, 13, 14, 15])).toBe('1-3, 7, 12-15')
  })
})
