import type { BetSpot } from '../model/bet.ts'

const ORDINALS = ['1st', '2nd', '3rd']

// Which third of the table a column or dozen is: columns start at 1, 2, 3; dozens at 1, 13, 25.
function columnIndex(spot: BetSpot): number {
  return (Math.min(...spot.numbers) - 1) % 3
}

function dozenIndex(spot: BetSpot): number {
  return Math.floor((Math.min(...spot.numbers) - 1) / 12)
}

// Full name of a bet, for the bet list and messages.
export function betName(spot: BetSpot): string {
  const { type, numbers } = spot
  switch (type) {
    case 'straight':
      return `Straight ${numbers.join('/')}`
    case 'split':
      return `Split ${numbers.join('/')}`
    case 'street':
      return `Street ${numbers.join('/')}`
    case 'corner':
      return `Corner ${numbers.join('/')}`
    case 'line':
      return `Line ${Math.min(...numbers)}-${Math.max(...numbers)}`
    case 'column':
      return `${ORDINALS[columnIndex(spot)]} Column`
    case 'dozen':
      return `${ORDINALS[dozenIndex(spot)]} Dozen`
    case 'red':
      return 'Red'
    case 'black':
      return 'Black'
    case 'even':
      return 'Even'
    case 'odd':
      return 'Odd'
    case 'low':
      return '1-18'
    case 'high':
      return '19-36'
  }
}

// Text printed on the felt for a zone. Empty for zones that show no text
// (inside bets, red and black: the diamonds are drawn as shapes).
export function feltLabel(spot: BetSpot): string {
  const { type, numbers } = spot
  switch (type) {
    case 'straight':
      return String(numbers[0])
    case 'column':
      return '2 to 1'
    case 'dozen':
      return `${ORDINALS[dozenIndex(spot)]} 12`
    case 'low':
      return '1-18'
    case 'even':
      return 'EVEN'
    case 'odd':
      return 'ODD'
    case 'high':
      return '19-36'
    default:
      return ''
  }
}
