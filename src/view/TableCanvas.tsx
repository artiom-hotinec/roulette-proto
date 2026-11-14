import { useEffect, useRef } from 'react'
import { Application, Container } from 'pixi.js'
import type { BetType } from '../model/bet.ts'
import type { PlacedBet } from '../model/betSlip.ts'
import type { TableZone } from '../table/layout.ts'
import { ChipLayer } from './ChipLayer.ts'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './design.ts'
import { TableView, ZONES } from './TableView.ts'

const BACKGROUND = '#0b1a30'

declare global {
  interface Window {
    /** Dev only: helpers for checking the canvas from a browser, where it has no DOM to query. */
    __roulette?: {
      /** Centre of a zone, in client coordinates (what a mouse click takes); null if there is no such zone. */
      zoneCenter: (type: BetType, numbers: readonly number[]) => { x: number; y: number } | null
    }
  }
}

type Props = {
  bets: readonly PlacedBet[]
  onPlace: (zone: TableZone) => void
  onRemove: (zone: TableZone) => void
}

function fitRoot(root: Container, width: number, height: number) {
  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT)
  root.scale.set(scale)
  root.position.set(
    (width - DESIGN_WIDTH * scale) / 2,
    (height - DESIGN_HEIGHT * scale) / 2,
  )
}

export default function TableCanvas({ bets, onPlace, onRemove }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  // The Pixi app is built once, so its callbacks read the current props through these refs.
  const betsRef = useRef(bets)
  const onPlaceRef = useRef(onPlace)
  const onRemoveRef = useRef(onRemove)
  const chipLayerRef = useRef<ChipLayer | null>(null)

  useEffect(() => {
    onPlaceRef.current = onPlace
    onRemoveRef.current = onRemove
  })

  useEffect(() => {
    betsRef.current = bets
    chipLayerRef.current?.setBets(bets)
  }, [bets])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const app = new Application()
    let cancelled = false
    let devHook: Window['__roulette']

    const ready = app.init({
      resizeTo: host,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
      background: BACKGROUND,
    })

    const root = new Container({ label: 'root' })
    const onResize = (width: number, height: number) => fitRoot(root, width, height)
    // Pixi's resize plugin only listens to window resize; watch the host too.
    const observer = new ResizeObserver(() => app.queueResize())

    ready.then(() => {
      if (cancelled) return
      host.appendChild(app.canvas)
      app.stage.addChild(root)

      const view = new TableView(app.renderer)
      view.onPlace = (zone) => onPlaceRef.current(zone)
      view.onRemove = (zone) => onRemoveRef.current(zone)
      const chipLayer = new ChipLayer(ZONES, view.projection)
      chipLayer.setBets(betsRef.current)
      view.chips.addChild(chipLayer)
      chipLayerRef.current = chipLayer
      root.addChild(view)

      fitRoot(root, app.screen.width, app.screen.height)
      app.renderer.on('resize', onResize)
      observer.observe(host)

      if (import.meta.env.DEV) {
        devHook = {
          zoneCenter: (type, numbers) => {
            const point = view.zoneCenter(type, numbers)
            if (!point) return null
            // Design coordinates to canvas pixels (through root's fit transform), then to the page.
            const screen = view.toGlobal(point)
            const box = app.canvas.getBoundingClientRect()
            return {
              x: box.left + (screen.x * box.width) / app.screen.width,
              y: box.top + (screen.y * box.height) / app.screen.height,
            }
          },
        }
        window.__roulette = devHook
      }
    })

    return () => {
      cancelled = true
      observer.disconnect()
      chipLayerRef.current = null
      if (devHook && window.__roulette === devHook) delete window.__roulette
      // destroy() throws before init() resolves, so always wait for it.
      ready.then(
        () => app.destroy(
          { removeView: true, releaseGlobalResources: true },
          { children: true },
        ),
        () => {},
      )
    }
  }, [])

  return <div ref={hostRef} className="table-host" />
}
