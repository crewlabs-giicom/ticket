import { describe, it, expect } from 'vitest'
import { calcNextDue, billStage } from '../utils/billCycle'

describe('calcNextDue', () => {
  it('menambah bulan sesuai siklus', () => {
    expect(calcNextDue('2026-01-15', 'monthly')).toBe('2026-02-15')
    expect(calcNextDue('2026-01-15', 'quarterly')).toBe('2026-04-15')
    expect(calcNextDue('2026-01-15', 'semiannual')).toBe('2026-07-15')
    expect(calcNextDue('2026-01-15', 'yearly')).toBe('2027-01-15')
  })
  it('clamp ke akhir bulan', () => {
    expect(calcNextDue('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(calcNextDue('2028-01-31', 'monthly')).toBe('2028-02-29')
    expect(calcNextDue('2026-08-31', 'quarterly')).toBe('2026-11-30')
  })
  it('melewati pergantian tahun', () => {
    expect(calcNextDue('2026-12-10', 'monthly')).toBe('2027-01-10')
    expect(calcNextDue('2026-11-30', 'quarterly')).toBe('2027-02-28')
  })
  it("siklus 'once' atau tak dikenal tidak mengubah tanggal", () => {
    expect(calcNextDue('2026-05-05', 'once')).toBe('2026-05-05')
    expect(calcNextDue('2026-05-05', 'x')).toBe('2026-05-05')
  })
})

describe('billStage', () => {
  it('menentukan tahap pengingat', () => {
    expect(billStage(-2, 7)).toBe('over')
    expect(billStage(0, 7)).toBe('d0')
    expect(billStage(1, 7)).toBe('d1')
    expect(billStage(3, 7)).toBe('d3')
    expect(billStage(7, 7)).toBe('early')
    expect(billStage(8, 7)).toBeNull()
  })
})
