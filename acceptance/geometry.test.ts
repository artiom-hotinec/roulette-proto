import { describe, expect, it } from 'vitest'
import { buildTableLayout, hitTest } from '../src/table/layout.ts'

/*
 * Acceptance tests for the table geometry (src/table/layout.ts).
 *
 * Contract:
 * - buildTableLayout() returns { zones }, generated from a table config (not a list of coordinates).
 * - A zone is { type, numbers, rect: { x, y, width, height } } plus whatever the UI needs.
 *   Numbers are unique and ascending. Rects use whole pixels.
 * - hitTest(zones, x, y) returns the zone under the point, or null.
 *   It accepts any objects with a `rect`. Rect edges belong to the zone. When the point lies on a
 *   border shared by several zones, the zone with the smallest area wins. The order of `zones`
 *   does not change the result.
 */

type Zone = ReturnType<typeof buildTableLayout>['zones'][number]
type Rect = Zone['rect']
interface Point {
  x: number
  y: number
}

const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
const INSIDE_TYPES = ['split', 'street', 'corner', 'line']

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

const betKey = (type: string, numbers: readonly number[]): string =>
  `${type} ${[...numbers].sort((a, b) => a - b).join('/')}`

const zoneKey = (zone: Zone): string => betKey(zone.type, zone.numbers)

/** Every bet a single-zero table offers, derived from the rules rather than from the layout. */
function expectedBets(): string[] {
  const bets: string[] = []
  const add = (type: string, numbers: number[]) => {
    bets.push(betKey(type, numbers))
  }
  for (const n of range(0, 36)) add('straight', [n])
  for (const n of [1, 2, 3]) add('split', [0, n])
  for (const n of range(1, 36)) {
    if (n % 3 !== 0) add('split', [n, n + 1]) // same street
    if (n <= 33) add('split', [n, n + 3]) // adjacent streets
  }
  for (let s = 1; s <= 34; s += 3) add('street', [s, s + 1, s + 2])
  for (const n of range(1, 32)) {
    if (n % 3 !== 0) add('corner', [n, n + 1, n + 3, n + 4])
  }
  for (let s = 1; s <= 31; s += 3) add('line', range(s, s + 5))
  for (const c of [1, 2, 3]) add('column', range(1, 36).filter((n) => n % 3 === c % 3))
  for (const first of [1, 13, 25]) add('dozen', range(first, first + 11))
  add('red', RED)
  add('black', range(1, 36).filter((n) => !RED.includes(n)))
  add('even', range(1, 36).filter((n) => n % 2 === 0))
  add('odd', range(1, 36).filter((n) => n % 2 === 1))
  add('low', range(1, 18))
  add('high', range(19, 36))
  return bets.sort()
}

const right = (r: Rect): number => r.x + r.width
const bottom = (r: Rect): number => r.y + r.height
const area = (r: Rect): number => r.width * r.height
const centre = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })
const contains = (r: Rect, p: Point): boolean =>
  p.x >= r.x && p.x <= right(r) && p.y >= r.y && p.y <= bottom(r)

/** Intersection of two closed rects; it is empty when x0 > x1 or y0 > y1. */
function intersect(a: Rect, b: Rect) {
  return {
    x0: Math.max(a.x, b.x),
    x1: Math.min(right(a), right(b)),
    y0: Math.max(a.y, b.y),
    y1: Math.min(bottom(a), bottom(b)),
  }
}

/** The interiors intersect: the rects cover some area twice. */
function overlaps(a: Rect, b: Rect): boolean {
  const i = intersect(a, b)
  return i.x0 < i.x1 && i.y0 < i.y1
}

/** The closed rects meet, even if only at a corner point. */
function touches(a: Rect, b: Rect): boolean {
  const i = intersect(a, b)
  return i.x0 <= i.x1 && i.y0 <= i.y1
}

/** Midpoint of the border segment two rects share, or null if they share no segment. */
function sharedBorderMidpoint(a: Rect, b: Rect): Point | null {
  const i = intersect(a, b)
  if (i.x0 === i.x1 && i.y0 < i.y1) return { x: i.x0, y: (i.y0 + i.y1) / 2 }
  if (i.y0 === i.y1 && i.x0 < i.x1) return { x: (i.x0 + i.x1) / 2, y: i.y0 }
  return null
}

const { zones } = buildTableLayout()
const reversedZones = [...zones].reverse()
const orders = [
  ['table order', zones],
  ['reversed order', reversedZones],
] as const

const describeHit = (hit: Zone | null): string => (hit ? zoneKey(hit) : 'nothing')

function findZone(type: string, numbers: readonly number[]): Zone {
  const key = betKey(type, numbers)
  const zone = zones.find((z) => zoneKey(z) === key)
  if (!zone) throw new Error(`no "${key}" zone on the table`)
  return zone
}

const straightZone = (n: number): Zone | undefined =>
  zones.find((z) => z.type === 'straight' && z.numbers.length === 1 && z.numbers[0] === n)

describe('layout: bets on the table', () => {
  it('offers exactly the bets of a single-zero table, each once', () => {
    expect(zones.map(zoneKey).sort()).toEqual(expectedBets())
  })

  it.each<[string, number]>([
    ['straight', 37],
    ['split', 60],
    ['street', 12],
    ['corner', 22],
    ['line', 11],
    ['column', 3],
    ['dozen', 3],
    ['red', 1],
    ['black', 1],
    ['even', 1],
    ['odd', 1],
    ['low', 1],
    ['high', 1],
  ])('has the right number of %s zones (%i)', (type, count) => {
    expect(zones.filter((z) => z.type === type)).toHaveLength(count)
  })

  it('lists the numbers of every zone once, in ascending order', () => {
    const unordered = zones.filter((z) => z.numbers.some((n, i) => i > 0 && n <= z.numbers[i - 1]))
    expect(unordered.map((z) => `${z.type} ${z.numbers.join('/')}`)).toEqual([])
  })

  it('never puts zero into a corner, street or line', () => {
    const withZero = zones.filter(
      (z) => ['corner', 'street', 'line'].includes(z.type) && z.numbers.includes(0),
    )
    expect(withZero.map(zoneKey)).toEqual([])
  })

  it.each<[string, number[]]>([
    ['corner', [32, 33, 35, 36]],
    ['split', [0, 1]],
    ['line', [1, 2, 3, 4, 5, 6]],
  ])('a click on the %s %j zone yields that bet', (type, numbers) => {
    const p = centre(findZone(type, numbers).rect)
    const hit = hitTest(zones, p.x, p.y)
    expect(hit && { type: hit.type, numbers: [...hit.numbers] }).toEqual({ type, numbers })
  })
})

describe('layout: geometry', () => {
  it('uses whole-pixel rects wider and taller than 2 px', () => {
    const bad = zones.filter((z) => {
      const r = z.rect
      return ![r.x, r.y, r.width, r.height].every(Number.isInteger) || r.width <= 2 || r.height <= 2
    })
    expect(bad.map((z) => `${zoneKey(z)} ${JSON.stringify(z.rect)}`)).toEqual([])
  })

  it('has no two zones overlapping', () => {
    const overlapping: string[] = []
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        if (overlaps(zones[i].rect, zones[j].rect)) {
          overlapping.push(`${zoneKey(zones[i])} overlaps ${zoneKey(zones[j])}`)
        }
      }
    }
    expect(overlapping).toEqual([])
  })

  it('hits the same zone at its centre and 1 px inside every edge and corner', () => {
    const misses: string[] = []
    for (const zone of zones) {
      const r = zone.rect
      const c = centre(r)
      for (const x of [r.x + 1, c.x, right(r) - 1]) {
        for (const y of [r.y + 1, c.y, bottom(r) - 1]) {
          const hit = hitTest(zones, x, y)
          if (hit !== zone) misses.push(`${zoneKey(zone)} at (${x}, ${y}) -> ${describeHit(hit)}`)
        }
      }
    }
    expect(misses).toEqual([])
  })

  it('hits nothing outside the table', () => {
    const left = Math.min(...zones.map((z) => z.rect.x))
    const top = Math.min(...zones.map((z) => z.rect.y))
    const far = Math.max(...zones.map((z) => right(z.rect)))
    const low = Math.max(...zones.map((z) => bottom(z.rect)))
    const midX = (left + far) / 2
    const midY = (top + low) / 2
    const outside = [
      [left - 1, midY],
      [far + 1, midY],
      [midX, top - 1],
      [midX, low + 1],
      [left - 1, top - 1],
      [far + 1, low + 1],
    ]
    for (const [x, y] of outside) {
      expect(hitTest(zones, x, y), `(${x}, ${y})`).toBeNull()
    }
  })
})

describe('layout: inside bets sit on their numbers', () => {
  it('puts every split on the border of both its numbers', () => {
    const wrong: string[] = []
    for (const split of zones.filter((z) => z.type === 'split')) {
      for (const n of split.numbers) {
        const number = straightZone(n)
        if (!number || !sharedBorderMidpoint(split.rect, number.rect)) {
          wrong.push(`${zoneKey(split)} shares no border with ${n}`)
        }
      }
    }
    expect(wrong).toEqual([])
  })

  it('puts every corner against all four of its numbers', () => {
    const wrong: string[] = []
    for (const corner of zones.filter((z) => z.type === 'corner')) {
      for (const n of corner.numbers) {
        const number = straightZone(n)
        if (!number || !touches(corner.rect, number.rect)) {
          wrong.push(`${zoneKey(corner)} does not touch ${n}`)
        }
      }
    }
    expect(wrong).toEqual([])
  })

  it('keeps every split, street, corner and line next to its own numbers only', () => {
    const straights = zones.filter((z) => z.type === 'straight')
    const wrong: string[] = []
    for (const zone of zones.filter((z) => INSIDE_TYPES.includes(z.type))) {
      const touched = straights.filter((s) => touches(zone.rect, s.rect)).map((s) => s.numbers[0])
      const foreign = touched.filter((n) => !zone.numbers.includes(n))
      if (touched.length === 0) wrong.push(`${zoneKey(zone)} touches none of its numbers`)
      if (foreign.length > 0) wrong.push(`${zoneKey(zone)} touches ${foreign.join(', ')}`)
    }
    expect(wrong).toEqual([])
  })
})

describe('hitTest on the table: shared borders', () => {
  it('gives the border between a number and a split to the smaller zone', () => {
    const wrong: string[] = []
    let borders = 0
    for (const split of zones.filter((z) => z.type === 'split')) {
      for (const n of split.numbers) {
        const number = straightZone(n)
        const p = number && sharedBorderMidpoint(split.rect, number.rect)
        if (!number || !p) continue // reported by the placement tests
        borders++
        if (area(split.rect) === area(number.rect)) {
          wrong.push(`${zoneKey(split)} and ${zoneKey(number)} have the same area`)
          continue
        }
        const smaller = area(split.rect) < area(number.rect) ? split : number
        for (const [order, list] of orders) {
          const hit = hitTest(list, p.x, p.y)
          if (hit !== smaller) {
            wrong.push(
              `${zoneKey(split)} | ${zoneKey(number)} at (${p.x}, ${p.y}), ${order}: ` +
                `got ${describeHit(hit)}, expected ${zoneKey(smaller)}`,
            )
          }
        }
      }
    }
    expect(borders, 'number/split borders checked').toBe(120) // 60 splits x 2 numbers
    expect(wrong).toEqual([])
  })

  it('gives every shared border to the smallest zone on it, whatever the zone order', () => {
    const wrong: string[] = []
    let borders = 0
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        const p = sharedBorderMidpoint(zones[i].rect, zones[j].rect)
        if (!p) continue
        const onPoint = zones
          .filter((z) => contains(z.rect, p))
          .sort((a, b) => area(a.rect) - area(b.rect))
        if (area(onPoint[0].rect) === area(onPoint[1].rect)) continue // no single smallest zone
        borders++
        for (const [order, list] of orders) {
          const hit = hitTest(list, p.x, p.y)
          if (hit !== onPoint[0]) {
            wrong.push(
              `(${p.x}, ${p.y}) on ${onPoint.map(zoneKey).join(' | ')}, ${order}: ` +
                `got ${describeHit(hit)}, expected ${zoneKey(onPoint[0])}`,
            )
          }
        }
      }
    }
    expect(borders, 'shared borders checked').toBeGreaterThan(0)
    expect(wrong).toEqual([])
  })
})

describe('hitTest rules, on hand-made zones', () => {
  const big = { name: 'big', rect: { x: 0, y: 0, width: 40, height: 40 } }
  const rightStrip = { name: 'right strip', rect: { x: 40, y: 0, width: 8, height: 40 } }
  const leftStrip = { name: 'left strip', rect: { x: -8, y: 0, width: 8, height: 40 } }

  it('counts the edges of a rect as part of it', () => {
    const onEdges = [
      [0, 0],
      [40, 0],
      [0, 40],
      [40, 40],
      [0, 20],
      [40, 20],
      [20, 0],
      [20, 40],
    ]
    for (const [x, y] of onEdges) expect(hitTest([big], x, y), `(${x}, ${y})`).toBe(big)
    const justOutside = [
      [-0.5, 20],
      [40.5, 20],
      [20, -0.5],
      [20, 40.5],
    ]
    for (const [x, y] of justOutside) expect(hitTest([big], x, y), `(${x}, ${y})`).toBeNull()
  })

  it('gives a shared edge to the smaller zone, in either order', () => {
    expect(hitTest([big, rightStrip], 40, 20)).toBe(rightStrip)
    expect(hitTest([rightStrip, big], 40, 20)).toBe(rightStrip)
    expect(hitTest([big, leftStrip], 0, 20)).toBe(leftStrip)
    expect(hitTest([leftStrip, big], 0, 20)).toBe(leftStrip)
  })

  it('gives each side of a shared edge to its own zone', () => {
    expect(hitTest([big, rightStrip], 39, 20)).toBe(big)
    expect(hitTest([big, rightStrip], 41, 20)).toBe(rightStrip)
  })

  it('hits nothing when there are no zones', () => {
    expect(hitTest([], 0, 0)).toBeNull()
  })
})
