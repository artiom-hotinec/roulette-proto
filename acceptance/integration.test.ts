import { describe, expect, it } from 'vitest'
import { BetSlip } from '../src/model/betSlip.ts'
import { buildTableLayout, hitTest } from '../src/table/layout.ts'

// Where the table meets the slip: the zone found under the cursor goes to the slip as is.

describe('table zones as bet spots', () => {
  const { zones } = buildTableLayout()

  it('turns a click on corner 32/33/35/36 into a plain bet', () => {
    const corner = zones.find((z) => z.type === 'corner' && z.numbers.join('/') === '32/33/35/36')
    if (!corner) throw new Error('no corner 32/33/35/36 on the table')
    const { x, y, width, height } = corner.rect
    expect(hitTest(zones, x + width / 2, y + height / 2)).toBe(corner)

    const slip = new BetSlip()
    expect(slip.addChip(corner, '100')).toMatchObject({ ok: true })
    expect(slip.toBets()).toEqual([{ type: 'corner', numbers: [32, 33, 35, 36], amountMinor: '100' }])
  })

  it('accepts a chip on every zone of the table', () => {
    const refused: string[] = []
    for (const zone of zones) {
      const slip = new BetSlip()
      const accepted = slip.addChip(zone, '100').ok
      const bets = slip.toBets()
      const recorded =
        bets.length === 1 &&
        bets[0].type === zone.type &&
        bets[0].numbers.join('/') === zone.numbers.join('/') &&
        bets[0].amountMinor === '100'
      if (!accepted || !recorded) refused.push(`${zone.type} ${zone.numbers.join('/')}`)
    }
    expect(refused).toEqual([])
  })
})
