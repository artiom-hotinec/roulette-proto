import { describe, expect, it } from 'vitest'
import { BetSlip } from '../src/model/betSlip.ts'

/*
 * Acceptance tests for the bet slip model (src/model/betSlip.ts): pure TypeScript, no Pixi.
 *
 * Contract:
 * - new BetSlip(limits?) with limits { maxBetMinor, maxTotalMinor }. The defaults are 100 credits
 *   per bet position (every spot: straight, split, column, red...) and 1000 credits in total.
 * - Amounts are integer minor units written as strings, and 1 credit = 100 minor units.
 *   A chip amount is a positive integer in plain decimal digits: no sign, no leading zero, no spaces.
 * - addChip(spot, amountMinor) and double() return { ok: true } or { ok: false, error: <message> }.
 *   A refused action changes nothing. It is never trimmed to fit a limit.
 * - removeChip(spot) takes off the last chip placed on that spot.
 * - undo() reverts the last action that changed the slip: add, remove, double or clear.
 * - toBets() returns one { type, numbers, amountMinor } per spot that holds chips, as copies.
 */

type BetSpot = Parameters<BetSlip['addChip']>[0]
type SlipResult = ReturnType<BetSlip['addChip']>
interface PlainBet {
  type: string
  numbers: number[]
  amountMinor: string
}
interface BetLike {
  type: string
  numbers: readonly number[]
  amountMinor: string
}

const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** Credits to minor units: 1 credit = 100 minor units. */
const credits = (n: number): string => String(n * 100)

const straight = (n: number): BetSpot => ({ type: 'straight', numbers: [n] })
const SPLIT_0_1: BetSpot = { type: 'split', numbers: [0, 1] }
const RED_SPOT: BetSpot = { type: 'red', numbers: RED }

const bet = (spot: BetSpot, amountMinor: string): PlainBet => ({
  type: spot.type,
  numbers: [...spot.numbers],
  amountMinor,
})

const byKey = (a: BetLike, b: BetLike): number =>
  `${a.type} ${a.numbers.join('/')}`.localeCompare(`${b.type} ${b.numbers.join('/')}`)

const snapshot = (bets: readonly BetLike[], total: string) => ({ bets: [...bets].sort(byKey), total })

const state = (slip: BetSlip) => snapshot(slip.toBets(), slip.totalStakeMinor())

function expectState(slip: BetSlip, bets: PlainBet[], total: string): void {
  expect(state(slip)).toEqual(snapshot(bets, total))
}

function expectAccepted(result: SlipResult): void {
  expect(result).toMatchObject({ ok: true })
}

function expectRefused(result: SlipResult): void {
  expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/\S/) })
}

/** Places chips one by one; each of them must be accepted. */
function place(slip: BetSlip, spot: BetSpot, ...amounts: string[]): void {
  for (const amount of amounts) expectAccepted(slip.addChip(spot, amount))
}

/** Whether the slip took the chip. Throwing counts as refusing it. */
function takes(slip: BetSlip, spot: BetSpot, amountMinor: string): boolean {
  try {
    return slip.addChip(spot, amountMinor).ok
  } catch {
    return false
  }
}

describe('BetSlip: placing chips', () => {
  it('starts empty with a stake of "0"', () => {
    expectState(new BetSlip(), [], '0')
  })

  it('records a chip as { type, numbers, amountMinor } with the amount as an integer string', () => {
    const slip = new BetSlip()
    expectAccepted(slip.addChip(straight(17), credits(5)))
    expect(slip.toBets()).toEqual([{ type: 'straight', numbers: [17], amountMinor: '500' }])
    expect(slip.totalStakeMinor()).toBe('500')
  })

  it('stacks chips on the same spot into one bet', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    place(slip, straight(17), credits(25)) // a new, equal spot object
    expectState(slip, [bet(straight(17), '3000')], '3000')
  })

  it('keeps different spots apart and sums them in the total', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    place(slip, SPLIT_0_1, credits(10))
    place(slip, RED_SPOT, credits(25))
    expectState(
      slip,
      [bet(straight(17), '500'), bet(SPLIT_0_1, '1000'), bet(RED_SPOT, '2500')],
      '4000',
    )
  })

  it('keeps only type, numbers and amount, copied from the spot', () => {
    const numbers = [17]
    const zone = {
      type: 'straight' as const,
      numbers,
      label: 'Straight 17',
      rect: { x: 0, y: 0, width: 50, height: 50 },
    }
    const slip = new BetSlip()
    expectAccepted(slip.addChip(zone, credits(1)))
    numbers.push(18)
    expect(slip.toBets()).toEqual([{ type: 'straight', numbers: [17], amountMinor: '100' }])
  })

  it('hands out copies: editing the result of toBets() does not touch the slip', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    const bets = slip.toBets() as PlainBet[]
    const attempt = (edit: () => void) => {
      try {
        edit()
      } catch {
        // frozen copies are fine as well
      }
    }
    attempt(() => {
      bets[0].amountMinor = '999900'
    })
    attempt(() => bets[0].numbers.push(18))
    attempt(() => bets.push(bet(straight(1), '100')))
    expectState(slip, [bet(straight(17), '500')], '500')
  })

  it.each(['0', '-100', '1.5', '100.0', '1e3', '0x10', '+100', '0100', ' 100', '100 ', '', 'abc', 'NaN', 'Infinity'])(
    'refuses the amount %j and leaves the slip unchanged',
    (amount) => {
      const slip = new BetSlip()
      place(slip, straight(17), credits(5))
      expect(takes(slip, straight(17), amount), 'on a spot with chips').toBe(false)
      expect(takes(slip, straight(18), amount), 'on an empty spot').toBe(false)
      expectState(slip, [bet(straight(17), '500')], '500')
    },
  )
})

describe('BetSlip: removeChip', () => {
  it('takes off the last chip placed on the spot', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5), credits(25))
    slip.removeChip(straight(17))
    expectState(slip, [bet(straight(17), '500')], '500')
  })

  it('drops the bet when its last chip goes', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    slip.removeChip(straight(17))
    expectState(slip, [], '0')
  })

  it('leaves other spots alone', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    place(slip, SPLIT_0_1, credits(10))
    slip.removeChip(SPLIT_0_1)
    expectState(slip, [bet(straight(17), '500')], '500')
  })

  it('does nothing on a spot without chips', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    slip.removeChip(straight(18))
    expectState(slip, [bet(straight(17), '500')], '500')
  })
})

describe('BetSlip: undo', () => {
  it('takes back the last chip, then the one before', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    place(slip, straight(17), credits(25))
    slip.undo()
    expectState(slip, [bet(straight(17), '500')], '500')
    slip.undo()
    expectState(slip, [], '0')
  })

  it('puts back a removed chip', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5), credits(25))
    slip.removeChip(straight(17))
    slip.undo()
    expectState(slip, [bet(straight(17), '3000')], '3000')
  })

  it('reverts double', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    place(slip, RED_SPOT, credits(25))
    expectAccepted(slip.double())
    slip.undo()
    expectState(slip, [bet(straight(17), '500'), bet(RED_SPOT, '2500')], '3000')
  })

  it('brings back the bets removed by clear', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    place(slip, SPLIT_0_1, credits(10))
    slip.clear()
    slip.undo()
    expectState(slip, [bet(straight(17), '500'), bet(SPLIT_0_1, '1000')], '1500')
  })

  it('walks back through a mixed history step by step', () => {
    const slip = new BetSlip()
    const steps: Array<{ action: () => unknown; after: ReturnType<typeof snapshot> }> = [
      {
        action: () => slip.addChip(straight(17), credits(5)),
        after: snapshot([bet(straight(17), '500')], '500'),
      },
      {
        action: () => slip.addChip(SPLIT_0_1, credits(10)),
        after: snapshot([bet(straight(17), '500'), bet(SPLIT_0_1, '1000')], '1500'),
      },
      {
        action: () => slip.addChip(straight(17), credits(25)),
        after: snapshot([bet(straight(17), '3000'), bet(SPLIT_0_1, '1000')], '4000'),
      },
      {
        action: () => slip.removeChip(SPLIT_0_1),
        after: snapshot([bet(straight(17), '3000')], '3000'),
      },
      { action: () => slip.double(), after: snapshot([bet(straight(17), '6000')], '6000') },
      { action: () => slip.clear(), after: snapshot([], '0') },
    ]
    const empty = snapshot([], '0')

    steps.forEach(({ action, after }, i) => {
      action()
      expect(state(slip), `after step ${i + 1}`).toEqual(after)
    })
    for (let i = steps.length - 1; i >= 0; i--) {
      slip.undo()
      expect(state(slip), `undo of step ${i + 1}`).toEqual(i > 0 ? steps[i - 1].after : empty)
    }
    slip.undo()
    expect(state(slip), 'undo with no history left').toEqual(empty)
  })

  it('skips refused actions and removals that removed nothing', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(100))
    place(slip, straight(18), credits(5))
    expectRefused(slip.addChip(straight(17), credits(1)))
    expectRefused(slip.double())
    slip.removeChip(straight(19))
    slip.undo()
    expectState(slip, [bet(straight(17), '10000')], '10000')
  })

  it('skips chips refused by the total limit or for a malformed amount', () => {
    const slip = new BetSlip()
    for (const n of range(1, 10)) place(slip, straight(n), credits(100)) // total 1000
    expectRefused(slip.addChip(straight(11), credits(1))) // over the total
    expect(takes(slip, straight(11), '0')).toBe(false) // malformed
    slip.undo() // must take back the chip on 10, not a refused action
    expectState(
      slip,
      range(1, 9).map((n) => bet(straight(n), '10000')),
      '90000',
    )
  })

  it('skips a double refused by the total limit', () => {
    const slip = new BetSlip()
    for (const n of range(1, 11)) place(slip, straight(n), credits(25), credits(25)) // 550
    expectRefused(slip.double()) // 1100 is over the total; every bet stays within 100
    slip.undo() // must take back the last 25 on 11
    expect(slip.totalStakeMinor()).toBe('52500')
  })

  it('skips clear and double on an already empty slip', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    slip.clear()
    slip.clear() // nothing left to clear
    slip.double() // nothing to double
    slip.undo()
    expectState(slip, [bet(straight(17), '500')], '500')
  })

  it('does nothing when there is nothing to undo', () => {
    const slip = new BetSlip()
    expect(() => slip.undo()).not.toThrow()
    expectState(slip, [], '0')
  })
})

describe('BetSlip: clear', () => {
  it('removes every bet and zeroes the stake', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    place(slip, SPLIT_0_1, credits(10))
    place(slip, RED_SPOT, credits(25))
    slip.clear()
    expectState(slip, [], '0')
  })

  it('lets betting start again from zero', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(100))
    slip.clear()
    place(slip, straight(17), credits(1))
    expectState(slip, [bet(straight(17), '100')], '100')
  })
})

describe('BetSlip: double', () => {
  it('doubles every bet and the total', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    place(slip, SPLIT_0_1, credits(10))
    place(slip, RED_SPOT, credits(25))
    expectAccepted(slip.double())
    expectState(
      slip,
      [bet(straight(17), '1000'), bet(SPLIT_0_1, '2000'), bet(RED_SPOT, '5000')],
      '8000',
    )
  })

  it('doubles again on a second press', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    expectAccepted(slip.double())
    expectAccepted(slip.double())
    expectState(slip, [bet(straight(17), '2000')], '2000')
  })

  it('does not change bets handed out before', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(5))
    const before = slip.toBets()
    expectAccepted(slip.double())
    expect(before).toEqual([{ type: 'straight', numbers: [17], amountMinor: '500' }])
  })

  it('stays exact for amounts beyond floating-point precision', () => {
    const huge = '1000000000000000000000'
    const slip = new BetSlip({ maxBetMinor: huge, maxTotalMinor: huge })
    place(slip, straight(17), '9007199254740993') // 2^53 + 1
    place(slip, straight(18), '1')
    expect(slip.totalStakeMinor()).toBe('9007199254740994')
    expectAccepted(slip.double())
    expectState(
      slip,
      [bet(straight(17), '18014398509481986'), bet(straight(18), '2')],
      '18014398509481988',
    )
  })

  it('leaves an empty slip empty', () => {
    const slip = new BetSlip()
    slip.double()
    expectState(slip, [], '0')
  })
})

describe('BetSlip: limits (100 per bet position, 1000 in total)', () => {
  it('accepts a bet of exactly 100', () => {
    const slip = new BetSlip()
    expectAccepted(slip.addChip(straight(17), credits(100)))
    expectState(slip, [bet(straight(17), '10000')], '10000')
  })

  it('refuses the chip that would make a bet 101, with a message', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(100))
    expectRefused(slip.addChip(straight(17), credits(1)))
    expectRefused(slip.addChip(straight(17), '1')) // even one minor unit over
    expectState(slip, [bet(straight(17), '10000')], '10000')
  })

  it('refuses a chip that would take a bet past 100 instead of trimming it', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(25), credits(25), credits(25), credits(10), credits(10)) // 95
    expectRefused(slip.addChip(straight(17), credits(10))) // would be 105
    expectState(slip, [bet(straight(17), '9500')], '9500')
    expectAccepted(slip.addChip(straight(17), credits(5))) // exactly 100
    expectState(slip, [bet(straight(17), '10000')], '10000')
  })

  it.each<[string, BetSpot]>([
    ['split', SPLIT_0_1],
    ['street', { type: 'street', numbers: [1, 2, 3] }],
    ['corner', { type: 'corner', numbers: [32, 33, 35, 36] }],
    ['line', { type: 'line', numbers: range(1, 6) }],
    ['column', { type: 'column', numbers: range(1, 36).filter((n) => n % 3 === 1) }],
    ['dozen', { type: 'dozen', numbers: range(13, 24) }],
    ['red', RED_SPOT],
    ['black', { type: 'black', numbers: range(1, 36).filter((n) => !RED.includes(n)) }],
    ['even', { type: 'even', numbers: range(1, 36).filter((n) => n % 2 === 0) }],
    ['odd', { type: 'odd', numbers: range(1, 36).filter((n) => n % 2 === 1) }],
    ['low', { type: 'low', numbers: range(1, 18) }],
    ['high', { type: 'high', numbers: range(19, 36) }],
  ])('applies the 100 limit to a %s bet', (_type, spot) => {
    const slip = new BetSlip()
    expectAccepted(slip.addChip(spot, credits(100)))
    expectRefused(slip.addChip(spot, credits(1)))
    expectState(slip, [bet(spot, '10000')], '10000')
  })

  it('counts the 100 limit for each bet position separately, even where they share numbers', () => {
    const slip = new BetSlip()
    // every one of these covers 17
    place(slip, straight(17), credits(100))
    place(slip, { type: 'split', numbers: [17, 18] }, credits(100))
    place(slip, { type: 'corner', numbers: [13, 14, 16, 17] }, credits(100))
    place(slip, { type: 'dozen', numbers: range(13, 24) }, credits(100))
    place(slip, { type: 'odd', numbers: range(1, 36).filter((n) => n % 2 === 1) }, credits(100))
    expect(slip.totalStakeMinor()).toBe('50000')
  })

  it('accepts a total of exactly 1000', () => {
    const slip = new BetSlip()
    for (const n of range(1, 10)) place(slip, straight(n), credits(100))
    expect(slip.totalStakeMinor()).toBe('100000')
  })

  it('refuses the chip that would make the total 1001, with a message', () => {
    const slip = new BetSlip()
    for (const n of range(1, 10)) place(slip, straight(n), credits(100))
    expectRefused(slip.addChip(straight(11), credits(1)))
    expectRefused(slip.addChip(straight(11), '1')) // even one minor unit over
    expectState(
      slip,
      range(1, 10).map((n) => bet(straight(n), '10000')),
      '100000',
    )
  })

  it('refuses a chip that would take the total past 1000 instead of trimming it', () => {
    const slip = new BetSlip()
    for (const n of range(1, 9)) place(slip, straight(n), credits(100))
    place(slip, straight(10), credits(25), credits(25), credits(25), credits(10), credits(10)) // 995
    expectRefused(slip.addChip(straight(11), credits(10))) // would be 1005
    expect(slip.totalStakeMinor()).toBe('99500')
    expect(slip.toBets()).toHaveLength(10)
    expectAccepted(slip.addChip(straight(11), credits(5))) // exactly 1000
    expect(slip.totalStakeMinor()).toBe('100000')
  })

  it('allows double up to exactly 100 on a bet and exactly 1000 in total', () => {
    const one = new BetSlip()
    place(one, straight(17), credits(25), credits(25))
    expectAccepted(one.double())
    expectState(one, [bet(straight(17), '10000')], '10000')

    const ten = new BetSlip()
    for (const n of range(1, 10)) place(ten, straight(n), credits(25), credits(25))
    expectAccepted(ten.double())
    expect(ten.totalStakeMinor()).toBe('100000')
  })

  it('refuses a double that would take one bet past 100, and changes nothing', () => {
    const slip = new BetSlip()
    place(slip, straight(17), credits(25), credits(25), credits(10)) // 60, doubled 120
    place(slip, straight(18), credits(10)) // 10, doubled 20 would be fine
    expectRefused(slip.double())
    expectState(slip, [bet(straight(17), '6000'), bet(straight(18), '1000')], '7000')
  })

  it('refuses a double that would take the total past 1000, and changes nothing', () => {
    const slip = new BetSlip()
    for (const n of range(1, 11)) place(slip, straight(n), credits(25), credits(25)) // 550, doubled 1100
    expectRefused(slip.double())
    expectState(
      slip,
      range(1, 11).map((n) => bet(straight(n), '5000')),
      '55000',
    )
  })

  it('takes its limits from the constructor', () => {
    const slip = new BetSlip({ maxBetMinor: '500', maxTotalMinor: '800' })
    expectAccepted(slip.addChip(straight(17), '500'))
    expectRefused(slip.addChip(straight(17), '1'))
    expectAccepted(slip.addChip(straight(18), '300'))
    expectRefused(slip.addChip(straight(19), '1'))
    expectState(slip, [bet(straight(17), '500'), bet(straight(18), '300')], '800')
  })
})
