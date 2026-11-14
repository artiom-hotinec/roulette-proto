import { Container, Graphics, PerspectiveMesh, Polygon, Rectangle, Text } from 'pixi.js'
import type { DestroyOptions, FederatedPointerEvent, Renderer, TextStyleOptions } from 'pixi.js'
import { RED_NUMBERS, TABLE_CONFIG, buildTableLayout, hitTest } from '../table/layout.ts'
import type { BetType } from '../model/bet.ts'
import type { Rect, TableZone } from '../table/layout.ts'
import { betName, feltLabel } from '../ui/labels.ts'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './design.ts'
import { createProjection } from './projection.ts'
import type { Point, Projection, Quad } from './projection.ts'

// Where the flat art lands on screen, in design coordinates. Corner order: the art's top-left,
// top-right, bottom-right, bottom-left. Keep it convex.
export const TABLE_QUAD: Quad = [
  { x: 490, y: 120 },
  { x: 1000, y: 360 },
  { x: 830, y: 595 },
  { x: 270, y: 345 },
]

// Flat art, in table coordinates (the origin of buildTableLayout, so zone rects can be used as they are).
const FELT_MARGIN = 20
const RAIL_WIDTH = 24
const WOOD_WIDTH = 20
const RAIL_RADIUS = 18

const BAKE_RESOLUTION = 2
const MESH_VERTICES = 20

const COLORS = {
  wood: 0x8a4b1f,
  woodLight: 0xb06a30,
  woodDark: 0x5c2f12,
  rail: 0x1b1b1e,
  railStitch: 0x3a3a40,
  felt: 0x2f8040,
  feltShadow: 0x103a1a,
  cream: 0xf0e6c0,
  red: 0xd8201f,
  black: 0x111111,
  zero: 0x57f27a,
}

const FONT = 'Helvetica Neue, Arial, sans-serif'
const LINE_WIDTH = 2.5
// Numerals and "2 to 1" are rotated in the reference screenshot; set NUMERAL_ROTATION to match it.
const NUMERAL_ROTATION = 0
const COLUMN_LABEL_ROTATION = -Math.PI / 2

const HIGHLIGHT = { color: 0xffffff, alpha: 0.3 }
const TOOLTIP = {
  fontSize: 16,
  paddingX: 12,
  paddingY: 7,
  radius: 9,
  background: 0x101015,
  backgroundAlpha: 0.92,
  border: 0xffffff,
  borderAlpha: 0.25,
  // Space between the tooltip and the zone, and between the tooltip and the screen edge.
  gap: 10,
  margin: 6,
}

export const ZONES: readonly TableZone[] = buildTableLayout().zones
const STRAIGHT_BY_NUMBER = new Map<number, TableZone>(
  ZONES.filter((zone) => zone.type === 'straight').map((zone) => [zone.numbers[0], zone]),
)

const pad = (rect: Rect, margin: number): Rect => ({
  x: rect.x - margin,
  y: rect.y - margin,
  width: rect.width + margin * 2,
  height: rect.height + margin * 2,
})

const center = (rect: Rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })

function boundsOf(zones: readonly TableZone[]): Rect {
  const left = Math.min(...zones.map(({ rect }) => rect.x))
  const top = Math.min(...zones.map(({ rect }) => rect.y))
  const right = Math.max(...zones.map(({ rect }) => rect.x + rect.width))
  const bottom = Math.max(...zones.map(({ rect }) => rect.y + rect.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** The rects the hover highlight fills: the zone itself first, then the number cells it covers. */
function highlightRects(zone: TableZone): Rect[] {
  const rects = [zone.rect]
  for (const n of zone.numbers) {
    const cell = STRAIGHT_BY_NUMBER.get(n)
    // A straight zone is its own cell, which is already in the list.
    if (cell && cell !== zone) rects.push(cell.rect)
  }
  return rects
}

const FELT = pad(boundsOf(ZONES), FELT_MARGIN)
const RAIL = pad(FELT, RAIL_WIDTH)

/** The whole flat art: felt, padded rail and the wooden front edge below it. */
export const TABLE_ART: Rect = {
  x: RAIL.x,
  y: RAIL.y,
  width: RAIL.width,
  height: RAIL.height + WOOD_WIDTH,
}

const rectQuad = (r: Rect): Quad => [
  { x: r.x, y: r.y },
  { x: r.x + r.width, y: r.y },
  { x: r.x + r.width, y: r.y + r.height },
  { x: r.x, y: r.y + r.height },
]

type Segment = readonly [x0: number, y0: number, x1: number, y1: number]

/** Cream lines: one in the middle of every gap, plus the outline of the numbers and of the outside rows. */
function gridLines(): Segment[] {
  const { cellWidth, cellHeight, gap, rows, columns, zeroWidth, columnBetWidth, outsideRows } = TABLE_CONFIG
  const half = gap / 2
  const cellX = (col: number): number => zeroWidth + gap + col * (cellWidth + gap)
  const cellY = (row: number): number => row * (cellHeight + gap)

  const left = -half
  const top = -half
  const numbersLeft = cellX(0) - half
  const numbersRight = cellX(columns) - half
  const right = numbersRight + columnBetWidth + gap
  const bottom = cellY(rows - 1) + cellHeight + half

  const lines: Segment[] = [
    [left, top, right, top],
    [left, bottom, right, bottom],
    [left, top, left, bottom],
    [right, top, right, bottom],
  ]
  // Between zero and the first column, between columns, and before "2 to 1".
  for (let col = 0; col <= columns; col++) {
    const x = cellX(col) - half
    lines.push([x, top, x, bottom])
  }
  // Between rows; zero is one tall cell, so these start after it.
  for (let row = 1; row < rows; row++) {
    const y = cellY(row) - half
    lines.push([numbersLeft, y, right, y])
  }
  // Outside rows, each under the numbers only.
  let rowTop = bottom
  for (const outsideRow of outsideRows) {
    const rowBottom = rowTop + outsideRow.height + gap
    lines.push([numbersLeft, rowBottom, numbersRight, rowBottom])
    const span = columns / outsideRow.bets.length
    for (let k = 0; k <= outsideRow.bets.length; k++) {
      const x = cellX(k * span) - half
      lines.push([x, rowTop, x, rowBottom])
    }
    rowTop = rowBottom
  }
  return lines
}

function drawFrame(g: Graphics) {
  // Wooden front edge: its top hides behind the rail, so only the strip below the rail shows.
  const woodTop = RAIL.y + RAIL.height - WOOD_WIDTH * 2
  const woodBottom = TABLE_ART.y + TABLE_ART.height
  g.roundRect(TABLE_ART.x, woodTop, TABLE_ART.width, woodBottom - woodTop, 14).fill(COLORS.wood)
  const railBottom = RAIL.y + RAIL.height
  for (const [offset, color, alpha] of [
    [5, COLORS.woodLight, 0.6],
    [11, COLORS.woodDark, 0.35],
    [16, COLORS.woodDark, 0.5],
  ] as const) {
    g.moveTo(TABLE_ART.x + 14, railBottom + offset)
      .lineTo(TABLE_ART.x + TABLE_ART.width - 14, railBottom + offset)
      .stroke({ width: 1.5, color, alpha })
  }

  // Padded rail, with a stitched seam along it.
  g.roundRect(RAIL.x, RAIL.y, RAIL.width, RAIL.height, RAIL_RADIUS)
    .fill(COLORS.rail)
    .stroke({ width: 2, color: COLORS.railStitch, alignment: 1 })
  const seam = pad(RAIL, -5)
  g.roundRect(seam.x, seam.y, seam.width, seam.height, RAIL_RADIUS - 5).stroke({
    width: 1.5,
    color: COLORS.railStitch,
    alpha: 0.7,
  })

  // Felt, with a shadow where the rail overhangs it.
  g.roundRect(FELT.x, FELT.y, FELT.width, FELT.height, 6)
    .fill(COLORS.felt)
    .stroke({ width: 4, color: COLORS.feltShadow, alpha: 0.55, alignment: 1 })
}

function drawLines(g: Graphics) {
  for (const [x0, y0, x1, y1] of gridLines()) g.moveTo(x0, y0).lineTo(x1, y1)
  g.stroke({ width: LINE_WIDTH, color: COLORS.cream, cap: 'square', join: 'miter' })
}

function drawDiamond(g: Graphics, rect: Rect, color: number) {
  const { x, y } = center(rect)
  const halfWidth = 34
  const halfHeight = 16
  g.poly([x - halfWidth, y, x, y - halfHeight, x + halfWidth, y, x, y + halfHeight])
    .fill(color)
    .stroke({ width: 1.5, color: COLORS.cream, alpha: 0.6 })
}

function makeText(text: string, rect: Rect, fill: number, style: TextStyleOptions, rotation = 0): Text {
  const { x, y } = center(rect)
  return new Text({
    text,
    style: { fontFamily: FONT, fontWeight: 'bold', fill, ...style },
    anchor: 0.5,
    x,
    y,
    rotation,
    // The renderer's resolution would blur the text once the art is baked at BAKE_RESOLUTION.
    resolution: BAKE_RESOLUTION,
  })
}

function numeralColor(n: number): number {
  if (n === 0) return COLORS.zero
  return RED_NUMBERS.includes(n) ? COLORS.red : COLORS.black
}

/** Draws the flat table art around the layout origin; the caller owns (and destroys) the result. */
function buildArt(): Container {
  const art = new Container({ label: 'table-art' })
  const shapes = new Graphics()
  drawFrame(shapes)
  drawLines(shapes)
  art.addChild(shapes)

  const texts: Text[] = []
  for (const zone of ZONES) {
    if (zone.type === 'red' || zone.type === 'black') {
      drawDiamond(shapes, zone.rect, COLORS[zone.type])
      continue
    }
    const label = feltLabel(zone)
    if (!label) continue
    switch (zone.type) {
      case 'straight':
        texts.push(makeText(label, zone.rect, numeralColor(zone.numbers[0]), { fontSize: 30 }, NUMERAL_ROTATION))
        break
      case 'column':
        texts.push(makeText(label, zone.rect, COLORS.cream, { fontSize: 17 }, COLUMN_LABEL_ROTATION))
        break
      default:
        texts.push(makeText(label, zone.rect, COLORS.cream, { fontSize: 22 }))
    }
  }
  art.addChild(...texts)
  return art
}

/** Renders the flat art once into a texture of TABLE_ART's size, at BAKE_RESOLUTION. */
function bakeArt(renderer: Renderer) {
  const art = buildArt()
  const texture = renderer.generateTexture({
    target: art,
    frame: new Rectangle(TABLE_ART.x, TABLE_ART.y, TABLE_ART.width, TABLE_ART.height),
    resolution: BAKE_RESOLUTION,
    antialias: true,
  })
  art.destroy({ children: true })
  return texture
}

/** The table: flat art baked into a texture and tilted onto TABLE_QUAD, with hover highlight and tooltip on top. */
export class TableView extends Container {
  /** Maps table (layout) coordinates to design coordinates and back, for overlays and hit testing. */
  readonly projection: Projection
  readonly mesh: PerspectiveMesh
  /** Empty layer between the highlight and the tooltip, for whoever draws chips. */
  readonly chips: Container

  /** Left click on a zone. */
  onPlace: (zone: TableZone) => void = () => {}
  /** Shift+click or right click on a zone. */
  onRemove: (zone: TableZone) => void = () => {}

  private readonly highlight: Graphics
  private readonly tooltip: Container
  private readonly tooltipBackground: Graphics
  private readonly tooltipText: Text
  private hovered: TableZone | null = null

  constructor(renderer: Renderer) {
    super({ label: 'table' })
    this.projection = createProjection(rectQuad(TABLE_ART), TABLE_QUAD)
    const [p0, p1, p2, p3] = TABLE_QUAD
    this.mesh = new PerspectiveMesh({
      texture: bakeArt(renderer),
      verticesX: MESH_VERTICES,
      verticesY: MESH_VERTICES,
      x0: p0.x, y0: p0.y,
      x1: p1.x, y1: p1.y,
      x2: p2.x, y2: p2.y,
      x3: p3.x, y3: p3.y,
    })
    this.mesh.eventMode = 'none'

    this.highlight = new Graphics({ label: 'highlight' })
    this.chips = new Container({ label: 'chips' })
    this.tooltipBackground = new Graphics()
    this.tooltipText = new Text({
      style: { fontFamily: FONT, fontWeight: 'bold', fontSize: TOOLTIP.fontSize, fill: 0xffffff },
      anchor: 0.5,
      resolution: BAKE_RESOLUTION,
    })
    this.tooltip = new Container({ label: 'tooltip', visible: false })
    this.tooltip.addChild(this.tooltipBackground, this.tooltipText)

    // Overlays never take part in hit testing: the zone comes from unprojecting the pointer.
    for (const overlay of [this.highlight, this.chips, this.tooltip]) overlay.eventMode = 'none'
    this.addChild(this.mesh, this.highlight, this.chips, this.tooltip)

    // The whole projected table is the hit area; everything inside it is sorted out by hitTest.
    this.eventMode = 'static'
    this.hitArea = new Polygon(TABLE_QUAD.flatMap(({ x, y }) => [x, y]))
    this.on('pointermove', (e) => this.setHovered(this.zoneAt(e)))
    this.on('pointerout', () => this.setHovered(null))
    this.on('pointertap', (e) => this.click(e))
    // Right click removes a chip; keep the browser's menu from opening over it.
    this.on('contextmenu', (e) => e.preventDefault())
  }

  override destroy(options?: DestroyOptions) {
    const { texture } = this.mesh
    super.destroy(options)
    this.mesh.destroy()
    texture.destroy(true)
  }

  /** Projected centre of the zone with these numbers, in design coordinates; null if there is no such zone. */
  zoneCenter(type: BetType, numbers: readonly number[]): Point | null {
    const wanted = [...numbers].sort((a, b) => a - b).join(',')
    const zone = ZONES.find((z) => z.type === type && [...z.numbers].sort((a, b) => a - b).join(',') === wanted)
    if (!zone) return null
    const { x, y } = center(zone.rect)
    return this.projection.project(x, y)
  }

  private zoneAt(e: FederatedPointerEvent): TableZone | null {
    const local = e.getLocalPosition(this)
    const { x, y } = this.projection.unproject(local.x, local.y)
    return hitTest(ZONES, x, y)
  }

  private click(e: FederatedPointerEvent) {
    const zone = this.zoneAt(e)
    if (!zone) return
    if (e.button === 2 || (e.button === 0 && e.shiftKey)) this.onRemove(zone)
    else if (e.button === 0) this.onPlace(zone)
  }

  private setHovered(zone: TableZone | null) {
    if (zone === this.hovered) return
    this.hovered = zone
    // One list of highlighted quads, in design coordinates, for both the fill and the tooltip placement.
    const quads = zone ? highlightRects(zone).map((rect) => this.projectRect(rect)) : []
    this.drawHighlight(quads)
    this.showTooltip(zone, quads)
  }

  /** Corners of a table-space rect, in design coordinates. */
  private projectRect(rect: Rect): Point[] {
    return rectQuad(rect).map(({ x, y }) => this.projection.project(x, y))
  }

  private drawHighlight(quads: readonly Point[][]) {
    this.highlight.clear()
    for (const quad of quads) this.highlight.poly(quad.flatMap(({ x, y }) => [x, y])).fill(HIGHLIGHT)
  }

  /** `quads` are the projected highlighted rects, the zone's own first; the tooltip stays clear of all of them. */
  private showTooltip(zone: TableZone | null, quads: readonly Point[][]) {
    this.tooltip.visible = zone !== null
    if (!zone) return
    const { fontSize, paddingX, paddingY, radius, gap, margin } = TOOLTIP
    this.tooltipText.text = betName(zone)
    const width = this.tooltipText.width + paddingX * 2
    const height = fontSize + paddingY * 2
    this.tooltipText.position.set(width / 2, height / 2)
    this.tooltipBackground
      .clear()
      .roundRect(0, 0, width, height, radius)
      .fill({ color: TOOLTIP.background, alpha: TOOLTIP.backgroundAlpha })
      .stroke({ width: 1, color: TOOLTIP.border, alpha: TOOLTIP.borderAlpha })

    // Upright box centred on the projected zone and nudged back onto the screen horizontally. Then it sits
    // `gap` above the topmost vertex of every highlighted quad under its x-span, so it covers none of them.
    const clamp = (value: number, size: number, limit: number) =>
      Math.max(margin, Math.min(value, limit - size - margin))
    const zoneCorners = quads[0]
    const centerX = zoneCorners.reduce((sum, p) => sum + p.x, 0) / zoneCorners.length
    const left = clamp(centerX - width / 2, width, DESIGN_WIDTH)
    const right = left + width
    let top = Infinity
    for (const quad of quads) {
      const xs = quad.map((p) => p.x)
      if (Math.max(...xs) <= left || Math.min(...xs) >= right) continue
      top = Math.min(top, ...quad.map((p) => p.y))
    }
    this.tooltip.position.set(left, clamp(top - gap - height, height, DESIGN_HEIGHT))
  }
}
