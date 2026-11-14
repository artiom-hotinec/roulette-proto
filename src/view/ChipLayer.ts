import { Container, Graphics, Text } from 'pixi.js'
import type { PlacedBet } from '../model/betSlip.ts'
import { TABLE_CONFIG } from '../table/layout.ts'
import type { TableZone } from '../table/layout.ts'
import { CHIPS, formatCredits, stackChips } from '../ui/chips.ts'
import type { Chip } from '../ui/chips.ts'
import type { Point, Projection } from './projection.ts'

// A chip is this share of the projected width of a number cell at its spot.
const CHIP_WIDTH_RATIO = 1.1
// Height of the flat ellipse relative to its width.
const CHIP_ASPECT = 0.6
// How many px each chip sits above the one below; also the height of the visible chip side.
const CHIP_STEP = 4
const SIDE_DARKEN = 0.6
const RIM_DARKEN = 0.45
// The inner face as a share of the chip; the ring between face and rim carries the edge marks.
const FACE_SCALE = 0.66
const MARK_COUNT = 8
const MARK_START = 0.78
const MARK_COLOR = 0xffffff

const FONT = 'Helvetica Neue, Arial, sans-serif'
const LABEL_SIZE_RATIO = 0.34
const LABEL_WIDTH_RATIO = 0.62
const LABEL_LIGHT = 0xffffff
const LABEL_DARK = 0x1a1a1a

const CHIP_BY_VALUE: ReadonlyMap<string, Chip> = new Map(CHIPS.map((chip) => [chip.valueMinor, chip]))

interface Stack {
  chips: readonly Chip[]
  label: string
  at: Point
  width: number
}

const spotKey = (type: string, numbers: readonly number[]): string =>
  `${type}:${[...numbers].sort((a, b) => a - b).join(',')}`

function darken(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor)
  const g = Math.round(((color >> 8) & 0xff) * factor)
  const b = Math.round((color & 0xff) * factor)
  return (r << 16) | (g << 8) | b
}

function isLight(color: number): boolean {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return 0.299 * r + 0.587 * g + 0.114 * b > 180
}

/** Draws one upright chip with its face centre at (x, y). */
function drawChip(g: Graphics, chip: Chip, x: number, y: number, width: number) {
  const rx = width / 2
  const ry = rx * CHIP_ASPECT
  const side = darken(chip.color, SIDE_DARKEN)
  const rim = darken(chip.color, RIM_DARKEN)

  // Side: a band under the top face, closed by the bottom edge.
  g.ellipse(x, y + CHIP_STEP, rx, ry).fill(side)
  g.rect(x - rx, y, width, CHIP_STEP).fill(side)

  // Top face with a darker rim.
  g.ellipse(x, y, rx, ry).fill(chip.color).stroke({ width: 1.5, color: rim })

  // Edge marks across the ring; on a light chip white would vanish, so they take the rim colour.
  const markColor = isLight(chip.color) ? rim : MARK_COLOR
  for (let k = 0; k < MARK_COUNT; k++) {
    const angle = (k / MARK_COUNT) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    g.moveTo(x + rx * MARK_START * cos, y + ry * MARK_START * sin).lineTo(x + rx * cos, y + ry * sin)
  }
  g.stroke({ width: 2.5, color: markColor })

  // Inner face.
  g.ellipse(x, y, rx * FACE_SCALE, ry * FACE_SCALE).fill(chip.color).stroke({ width: 1, color: rim, alpha: 0.7 })
}

/** Chip stacks on the table, one per bet, drawn in design coordinates. Not interactive. */
export class ChipLayer extends Container {
  private readonly zones: ReadonlyMap<string, TableZone>
  private readonly projection: Projection

  constructor(zones: readonly TableZone[], projection: Projection) {
    super({ label: 'chips' })
    this.eventMode = 'none'
    this.interactiveChildren = false
    this.zones = new Map(zones.map((zone) => [spotKey(zone.type, zone.numbers), zone]))
    this.projection = projection
  }

  /** Replaces every stack with one per bet. Bets that match no zone, or are under 1 credit, are skipped. */
  setBets(bets: readonly PlacedBet[]): void {
    for (const child of this.removeChildren()) child.destroy({ children: true })

    const stacks: Stack[] = []
    for (const bet of bets) {
      const zone = this.zones.get(spotKey(bet.type, bet.numbers))
      if (!zone) continue
      const chips = stackChips(bet.amountMinor).flatMap((value) => CHIP_BY_VALUE.get(value) ?? [])
      if (chips.length === 0) continue

      const x = zone.rect.x + zone.rect.width / 2
      const y = zone.rect.y + zone.rect.height / 2
      stacks.push({
        chips,
        label: formatCredits(bet.amountMinor),
        at: this.projection.project(x, y),
        width: this.chipWidth(x, y),
      })
    }

    // Back to front, so nearer stacks cover the ones behind them.
    stacks.sort((a, b) => a.at.y - b.at.y)
    for (const stack of stacks) this.addChild(this.buildStack(stack))
  }

  /** Projected width of a number cell centred on the table point, scaled to a chip. */
  private chipWidth(x: number, y: number): number {
    const half = TABLE_CONFIG.cellWidth / 2
    const left = this.projection.project(x - half, y)
    const right = this.projection.project(x + half, y)
    return Math.hypot(right.x - left.x, right.y - left.y) * CHIP_WIDTH_RATIO
  }

  private buildStack({ chips, label, at, width }: Stack): Container {
    const stack = new Container({ label: 'chip-stack' })
    const shapes = new Graphics()
    chips.forEach((chip, index) => drawChip(shapes, chip, at.x, at.y - index * CHIP_STEP, width))
    stack.addChild(shapes)

    const top = chips[chips.length - 1]
    const text = new Text({
      text: label,
      style: {
        fontFamily: FONT,
        fontWeight: 'bold',
        fontSize: Math.max(8, Math.round(width * LABEL_SIZE_RATIO)),
        fill: isLight(top.color) ? LABEL_DARK : LABEL_LIGHT,
      },
      anchor: 0.5,
      x: at.x,
      y: at.y - (chips.length - 1) * CHIP_STEP,
    })
    // Long totals shrink to stay on the face.
    const maxWidth = width * LABEL_WIDTH_RATIO
    if (text.width > maxWidth) text.scale.set(maxWidth / text.width)
    stack.addChild(text)
    return stack
  }
}
