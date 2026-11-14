export type Chip = {
  readonly valueMinor: string
  readonly label: string
  readonly color: number
}

// 1 credit = 100 minor units. Colours follow roulette-table.png: white, purple, green, red, blue.
export const CHIPS: readonly Chip[] = [
  { valueMinor: '100', label: '1', color: 0xf2f2f2 },
  { valueMinor: '500', label: '5', color: 0x7b3fa0 },
  { valueMinor: '1000', label: '10', color: 0x1f8a3b },
  { valueMinor: '2500', label: '25', color: 0xc8232c },
  { valueMinor: '10000', label: '100', color: 0x2a5db0 },
]

// Greedy split of an amount (minor units, canonical integer string) into chip values,
// largest first. Returns the chip values as minor-unit strings. A remainder smaller
// than the smallest chip (under 1 credit) has no chip and is dropped.
export function stackChips(amountMinor: string): string[] {
  let rest = BigInt(amountMinor)
  const stack: string[] = []
  for (const chip of [...CHIPS].reverse()) {
    const value = BigInt(chip.valueMinor)
    while (rest >= value) {
      stack.push(chip.valueMinor)
      rest -= value
    }
  }
  return stack
}

// Minor units to credits for display: '10000' -> '100', '12345' -> '123.45', '50' -> '0.50'.
export function formatCredits(amountMinor: string): string {
  const minor = BigInt(amountMinor)
  const negative = minor < 0n
  const abs = negative ? -minor : minor
  const whole = abs / 100n
  const cents = abs % 100n
  const sign = negative ? '-' : ''
  return cents === 0n ? `${sign}${whole}` : `${sign}${whole}.${cents.toString().padStart(2, '0')}`
}
