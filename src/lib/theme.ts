import type { DayId } from './types'

/** Each training day gets its own colour, used for rails, badges and marks. */
export const DAY_COLOR: Record<DayId, string> = {
  push: 'var(--push)',
  pull: 'var(--pull)',
  legs: 'var(--legs)',
  upper: 'var(--upper)',
}

/** Push and Pull both start "Pu", so compact views need unambiguous codes. */
export const DAY_SHORT: Record<DayId, string> = {
  push: 'PS',
  pull: 'PL',
  legs: 'LG',
  upper: 'UP',
}
