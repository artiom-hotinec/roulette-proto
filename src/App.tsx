import { useEffect, useState } from 'react'
import { BetSlip } from './model/betSlip.ts'
import type { SlipResult } from './model/betSlip.ts'
import type { TableZone } from './table/layout.ts'
import Controls from './ui/Controls.tsx'
import TableCanvas from './view/TableCanvas.tsx'

// 1 credit; the chip selected at start.
const DEFAULT_CHIP = '100'
const ERROR_MS = 4000

const snapshot = (slip: BetSlip) => ({ bets: slip.toBets(), totalMinor: slip.totalStakeMinor() })

export default function App() {
  const [slip] = useState(() => new BetSlip())
  const [selectedChip, setSelectedChip] = useState(DEFAULT_CHIP)
  const [shown, setShown] = useState(() => snapshot(slip))
  // An object, so that a repeated refusal with the same text restarts the timer.
  const [error, setError] = useState<{ message: string } | null>(null)

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(null), ERROR_MS)
    return () => clearTimeout(timer)
  }, [error])

  // Runs one slip action, then shows the slip as it is now. A refusal shows its error, an action that
  // changed the slip clears it, and an action that changed nothing keeps the current error.
  // Every change the slip records alters the total stake, so comparing totals detects a change.
  const act = (action: () => SlipResult | void) => {
    const totalBefore = slip.totalStakeMinor()
    const result = action()
    setShown(snapshot(slip))
    if (result && !result.ok) {
      setError({ message: result.error })
    } else if (slip.totalStakeMinor() !== totalBefore) {
      setError(null)
    }
  }

  return (
    <div className="game">
      <TableCanvas
        bets={shown.bets}
        onPlace={(zone: TableZone) => act(() => slip.addChip(zone, selectedChip))}
        onRemove={(zone: TableZone) => act(() => slip.removeChip(zone))}
      />
      <Controls
        selectedChip={selectedChip}
        onSelectChip={setSelectedChip}
        onClear={() => act(() => slip.clear())}
        onUndo={() => act(() => slip.undo())}
        onDouble={() => act(() => slip.double())}
        totalMinor={shown.totalMinor}
        error={error?.message ?? null}
      />
    </div>
  )
}
