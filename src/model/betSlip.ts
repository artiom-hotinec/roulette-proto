import type { BetSpot, BetType } from './bet.ts'

/** Limits in minor units, written as integer strings (1 credit = 100 minor units). */
export interface BetLimits {
  readonly maxBetMinor: string
  readonly maxTotalMinor: string
}

export type SlipResult = { readonly ok: true } | { readonly ok: false, readonly error: string }

export interface PlacedBet {
  type: BetType
  numbers: number[]
  amountMinor: string
}

interface SpotChips {
  readonly type: BetType
  readonly numbers: readonly number[]
  readonly chips: bigint[]
}

type Spots = Map<string, SpotChips>

const MINOR_PER_CREDIT = 100n
const AMOUNT_PATTERN = /^[1-9][0-9]*$/

export const DEFAULT_LIMITS: BetLimits = { maxBetMinor: '10000', maxTotalMinor: '100000' }

const OK: SlipResult = { ok: true }

function refuse(error: string): SlipResult {
  return { ok: false, error }
}

/** A sorted copy; the caller's array is never mutated. */
function sortedNumbers(numbers: readonly number[]): number[] {
  return [...numbers].sort((a, b) => a - b)
}

function spotKey(spot: BetSpot): string {
  return `${spot.type}:${sortedNumbers(spot.numbers).join(',')}`
}

function sum(chips: readonly bigint[]): bigint {
  return chips.reduce((total, chip) => total + chip, 0n)
}

/** Minor units as credits, without trailing zeros: 10000n -> '100', 150n -> '1.5'. */
function formatCredits(minor: bigint): string {
  const whole = minor / MINOR_PER_CREDIT
  const fraction = (minor % MINOR_PER_CREDIT).toString().padStart(2, '0').replace(/0+$/, '')
  return fraction === '' ? whole.toString() : `${whole}.${fraction}`
}

function copySpots(spots: Spots): Spots {
  const copy: Spots = new Map()
  for (const [key, entry] of spots) {
    copy.set(key, { type: entry.type, numbers: entry.numbers, chips: [...entry.chips] })
  }
  return copy
}

export class BetSlip {
  private readonly maxBet: bigint
  private readonly maxTotal: bigint
  private spots: Spots = new Map()
  private history: Spots[] = []

  constructor(limits: BetLimits = DEFAULT_LIMITS) {
    this.maxBet = BigInt(limits.maxBetMinor)
    this.maxTotal = BigInt(limits.maxTotalMinor)
  }

  addChip(spot: BetSpot, amountMinor: string): SlipResult {
    if (typeof amountMinor !== 'string' || !AMOUNT_PATTERN.test(amountMinor)) {
      return refuse('Chip amount must be a positive whole number of minor units')
    }
    const amount = BigInt(amountMinor)
    const key = spotKey(spot)
    const existing = this.spots.get(key)
    if ((existing ? sum(existing.chips) : 0n) + amount > this.maxBet) {
      return refuse(`Each bet position is limited to ${formatCredits(this.maxBet)} credits.`)
    }
    if (this.total() + amount > this.maxTotal) {
      return refuse(`Total bet is limited to ${formatCredits(this.maxTotal)} credits.`)
    }

    this.save()
    // save() replaced this.spots with a copy, so look the spot up again.
    const entry = this.spots.get(key)
    if (entry) {
      entry.chips.push(amount)
    } else {
      this.spots.set(key, { type: spot.type, numbers: sortedNumbers(spot.numbers), chips: [amount] })
    }
    return OK
  }

  removeChip(spot: BetSpot): void {
    const key = spotKey(spot)
    const existing = this.spots.get(key)
    if (!existing || existing.chips.length === 0) return

    this.save()
    // save() replaced this.spots with a copy, so look the spot up again.
    const entry = this.spots.get(key)
    if (!entry) return
    entry.chips.pop()
    if (entry.chips.length === 0) this.spots.delete(key)
  }

  /** Appends a copy of every spot's chips, so a later removeChip takes off one chip only. */
  double(): SlipResult {
    if (this.spots.size === 0) return OK

    for (const entry of this.spots.values()) {
      if (sum(entry.chips) * 2n > this.maxBet) {
        return refuse(`Each bet position is limited to ${formatCredits(this.maxBet)} credits.`)
      }
    }
    if (this.total() * 2n > this.maxTotal) {
      return refuse(`Total bet is limited to ${formatCredits(this.maxTotal)} credits.`)
    }

    this.save()
    for (const entry of this.spots.values()) {
      for (const chip of [...entry.chips]) entry.chips.push(chip)
    }
    return OK
  }

  undo(): void {
    const previous = this.history.pop()
    if (previous) this.spots = previous
  }

  clear(): void {
    if (this.spots.size === 0) return
    this.save()
    this.spots = new Map()
  }

  totalStakeMinor(): string {
    return this.total().toString()
  }

  toBets(): PlacedBet[] {
    return [...this.spots.values()].map((entry) => ({
      type: entry.type,
      numbers: [...entry.numbers],
      amountMinor: sum(entry.chips).toString(),
    }))
  }

  private total(): bigint {
    let total = 0n
    for (const entry of this.spots.values()) total += sum(entry.chips)
    return total
  }

  /**
   * Pushes the current state onto the undo history and continues on a copy, so the saved
   * snapshot is never touched by later edits. Call it only right before a change is applied.
   */
  private save(): void {
    this.history.push(this.spots)
    this.spots = copySpots(this.spots)
  }
}
