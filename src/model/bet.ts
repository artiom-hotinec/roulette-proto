export type BetType = 'straight' | 'split' | 'street' | 'corner' | 'line' | 'column' | 'dozen' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high'
export type BetSpot = { readonly type: BetType, readonly numbers: readonly number[] }
