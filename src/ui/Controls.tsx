import type { CSSProperties } from 'react'
import { CHIPS, formatCredits } from './chips.ts'
import './Controls.css'

type Props = {
  selectedChip: string
  onSelectChip: (valueMinor: string) => void
  onClear: () => void
  onUndo: () => void
  onDouble: () => void
  totalMinor: string
  error: string | null
}

// 0xRRGGBB number to a CSS colour string.
function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

// Label colour with enough contrast on the chip face (relative luminance, sRGB approximation).
function inkColor(color: number): string {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luma > 0.6 ? '#1b2638' : '#ffffff'
}

export default function Controls({
  selectedChip,
  onSelectChip,
  onClear,
  onUndo,
  onDouble,
  totalMinor,
  error,
}: Props) {
  const empty = totalMinor === '0'

  return (
    <footer className="controls">
      <div className="controls__chips" role="group" aria-label="Chips">
        {CHIPS.map((chip) => {
          const selected = chip.valueMinor === selectedChip
          const style = {
            '--chip': cssColor(chip.color),
            '--chip-ink': inkColor(chip.color),
          } as CSSProperties
          return (
            <button
              key={chip.valueMinor}
              type="button"
              className={selected ? 'chip chip--selected' : 'chip'}
              style={style}
              aria-pressed={selected}
              aria-label={`Chip ${chip.label}`}
              onClick={() => onSelectChip(chip.valueMinor)}
            >
              <span className="chip__label">{chip.label}</span>
            </button>
          )
        })}
      </div>

      <div className="controls__bar">
        <div className="controls__total">{`BET ${formatCredits(totalMinor)}`}</div>
        <p className="controls__error" role="alert">
          {error}
        </p>
        <div className="controls__actions">
          <button type="button" className="action" disabled={empty} onClick={onClear}>
            CLEAR
          </button>
          <button type="button" className="action" onClick={onUndo}>
            UNDO
          </button>
          <button type="button" className="action" disabled={empty} onClick={onDouble}>
            DOUBLE
          </button>
        </div>
      </div>
    </footer>
  )
}
