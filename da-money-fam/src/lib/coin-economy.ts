/** 2× denomination: same USD economics, bigger Coinz numbers */
export const COIN_UNIT_SCALE = 2

/** Post-rebase Starter pack: $8 / 100 Coinz */
export const COIN_RETAIL_USD = 0.08

export function scaleCoins(legacyAmount: number): number {
  return Math.max(0, Math.round(legacyAmount * COIN_UNIT_SCALE))
}
