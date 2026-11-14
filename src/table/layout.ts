import type { BetType } from '../model/bet.ts'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface TableZone {
  type: BetType
  numbers: number[]
  rect: Rect
}

/** A row of outside bets under the number grid; each bet spans `columns / bets.length` columns. */
interface OutsideRow {
  height: number
  bets: readonly BetType[]
}

interface TableConfig {
  /** Size of one number cell, in pixels. */
  cellWidth: number
  cellHeight: number
  /** Width of the strips between cells; split, corner, street and line zones live in them. */
  gap: number
  rows: number
  columns: number
  /** The zero cell on the left and the "2 to 1" column bets on the right. */
  zeroWidth: number
  columnBetWidth: number
  /** Rows below the street strips, top to bottom, separated by `gap`. */
  outsideRows: readonly OutsideRow[]
}

export const TABLE_CONFIG: TableConfig = {
  cellWidth: 56,
  cellHeight: 56,
  gap: 12,
  rows: 3,
  columns: 12,
  zeroWidth: 56,
  columnBetWidth: 56,
  outsideRows: [
    { height: 44, bets: ['dozen', 'dozen', 'dozen'] },
    { height: 44, bets: ['low', 'even', 'red', 'black', 'odd', 'high'] },
  ],
}

export const RED_NUMBERS: readonly number[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** Numbers of an outside bet; `position` is its index within its row (the dozen number for dozens). */
function outsideNumbers(type: BetType, position: number): number[] {
  const total = TABLE_CONFIG.rows * TABLE_CONFIG.columns
  const all = range(1, total)
  switch (type) {
    case 'dozen': {
      const size = total / 3
      return range(position * size + 1, (position + 1) * size)
    }
    case 'red':
      return [...RED_NUMBERS]
    case 'black':
      return all.filter((n) => !RED_NUMBERS.includes(n))
    case 'even':
      return all.filter((n) => n % 2 === 0)
    case 'odd':
      return all.filter((n) => n % 2 === 1)
    case 'low':
      return all.filter((n) => n <= total / 2)
    case 'high':
      return all.filter((n) => n > total / 2)
    default:
      throw new Error(`"${type}" is not an outside bet`)
  }
}

/**
 * Builds every zone of the table from TABLE_CONFIG. The origin is the top-left corner of the zero cell.
 *
 * Number cells sit on a grid; the strips of width `gap` between them are the inside bets:
 * a strip between two cells is a split, a strip crossing is a corner. The strip row under the
 * bottom row of cells holds the streets (under a cell) and the lines (under a vertical strip).
 */
export function buildTableLayout(): { zones: TableZone[] } {
  const { cellWidth, cellHeight, gap, rows, columns, zeroWidth, columnBetWidth, outsideRows } =
    TABLE_CONFIG
  const zones: TableZone[] = []

  const cellX = (col: number): number => zeroWidth + gap + col * (cellWidth + gap)
  const cellY = (row: number): number => row * (cellHeight + gap)
  /** Row 0 is the top row (3, 6 ... 36); the last row is the bottom one (1, 4 ... 34). */
  const numberAt = (col: number, row: number): number => col * rows + (rows - row)
  const add = (type: BetType, numbers: number[], x: number, y: number, width: number, height: number) => {
    zones.push({ type, numbers: [...numbers].sort((a, b) => a - b), rect: { x, y, width, height } })
  }

  const bottomRow = rows - 1
  const streetY = cellY(bottomRow) + cellHeight

  // Zero and the numbers.
  add('straight', [0], 0, 0, zeroWidth, rows * cellHeight + (rows - 1) * gap)
  for (let col = 0; col < columns; col++) {
    for (let row = 0; row < rows; row++) {
      add('straight', [numberAt(col, row)], cellX(col), cellY(row), cellWidth, cellHeight)
    }
  }

  // Strips between zero and the first column: splits 0/n.
  for (let row = 0; row < rows; row++) {
    add('split', [0, numberAt(0, row)], zeroWidth, cellY(row), gap, cellHeight)
  }

  // Strips between columns: splits, corners where they cross a strip between rows, and a line at the bottom.
  for (let col = 0; col < columns - 1; col++) {
    const x = cellX(col) + cellWidth
    for (let row = 0; row < rows; row++) {
      add('split', [numberAt(col, row), numberAt(col + 1, row)], x, cellY(row), gap, cellHeight)
      if (row < bottomRow) {
        const numbers = [col, col + 1].flatMap((c) => [numberAt(c, row), numberAt(c, row + 1)])
        add('corner', numbers, x, cellY(row) + cellHeight, gap, gap)
      }
    }
    add('line', range(numberAt(col, bottomRow), numberAt(col + 1, 0)), x, streetY, gap, gap)
  }

  // Strips between rows: splits, and a street at the bottom.
  for (let col = 0; col < columns; col++) {
    const x = cellX(col)
    for (let row = 0; row < bottomRow; row++) {
      add('split', [numberAt(col, row), numberAt(col, row + 1)], x, cellY(row) + cellHeight, cellWidth, gap)
    }
    add('street', range(numberAt(col, bottomRow), numberAt(col, 0)), x, streetY, cellWidth, gap)
  }

  // "2 to 1": one column bet per row, to the right of the last column.
  const columnBetX = cellX(columns - 1) + cellWidth + gap
  for (let row = 0; row < rows; row++) {
    const numbers = range(1, rows * columns).filter((n) => n % rows === (rows - row) % rows)
    add('column', numbers, columnBetX, cellY(row), columnBetWidth, cellHeight)
  }

  // Outside rows under the street strips.
  let y = streetY + gap
  for (const outsideRow of outsideRows) {
    const span = columns / outsideRow.bets.length
    if (!Number.isInteger(span)) {
      throw new Error(`${outsideRow.bets.length} bets do not divide ${columns} columns`)
    }
    outsideRow.bets.forEach((type, position) => {
      const width = span * cellWidth + (span - 1) * gap
      add(type, outsideNumbers(type, position), cellX(position * span), y, width, outsideRow.height)
    })
    y += outsideRow.height + gap
  }

  return { zones }
}

/**
 * The zone under the point, or null. Rect edges belong to the zone; on a border shared by several
 * zones the one with the smallest area wins; among zones of equal area the smaller `rect.x` wins,
 * then the smaller `rect.y`. The result does not depend on the order of `zones`.
 */
export function hitTest<T extends { rect: Rect }>(zones: readonly T[], x: number, y: number): T | null {
  let best: T | null = null
  let bestArea = Infinity
  for (const zone of zones) {
    const { rect } = zone
    if (x < rect.x || x > rect.x + rect.width || y < rect.y || y > rect.y + rect.height) continue
    const area = rect.width * rect.height
    const wins =
      best === null ||
      area < bestArea ||
      (area === bestArea && (rect.x < best.rect.x || (rect.x === best.rect.x && rect.y < best.rect.y)))
    if (wins) {
      best = zone
      bestArea = area
    }
  }
  return best
}
