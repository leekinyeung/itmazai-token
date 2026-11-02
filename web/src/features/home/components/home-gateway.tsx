/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useMediaQuery } from '@/hooks/use-media-query'

import { HOME_GATEWAY_CLIENTS } from '../home-clients'
import { buildGatewayLayout } from '../home-gateway-layout'
import { HOME_PROVIDERS } from '../model-providers'
import { GatewayDiagram } from './home-gateway-diagram'

const PROVIDERS = HOME_PROVIDERS.map((provider) => provider.name)
const CLIENTS = HOME_GATEWAY_CLIENTS.map((client) => client.name)
const MIN_DESKTOP_WIDTH = buildGatewayLayout({
  mobile: false,
  providers: PROVIDERS,
  clients: CLIENTS,
  width: 0,
}).width
const MOBILE_LAYOUT = buildGatewayLayout({
  mobile: true,
  providers: PROVIDERS,
  clients: CLIENTS,
})

export function HomeGateway(props: {
  logo: string
  brand: string
  paused?: boolean
}) {
  const id = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const desktopRef = useRef<SVGSVGElement>(null)
  const mobileRef = useRef<SVGSVGElement>(null)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const [dimensions, setDimensions] = useState({ width: 1000, height: 360 })
  const desktop = useMemo(
    () =>
      buildGatewayLayout({
        mobile: false,
        providers: PROVIDERS,
        clients: CLIENTS,
        width: dimensions.width,
      }),
    [dimensions.width]
  )

  useLayoutEffect(() => {
    if (isMobile) return
    const container = containerRef.current
    if (!container) return
    const measure = () => {
      const width = container.clientWidth
      if (!width) return
      const short = window.matchMedia(
        '(min-width: 1500px) and (max-height: 820px)'
      ).matches
      const height = short
        ? Math.min(380, Math.max(300, window.innerHeight - 330))
        : Math.min(400, Math.max(330, window.innerHeight - 520))
      const virtualWidth = Math.max(MIN_DESKTOP_WIDTH, width / (height / 360))
      const actualHeight = (width / virtualWidth) * 360
      setDimensions((previous) =>
        Math.abs(previous.width - virtualWidth) < 0.5 &&
        Math.abs(previous.height - actualHeight) < 0.5
          ? previous
          : { width: virtualWidth, height: actualHeight }
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [isMobile])

  useEffect(() => {
    for (const frame of [desktopRef.current, mobileRef.current]) {
      if (props.paused) frame?.pauseAnimations?.()
      else frame?.unpauseAnimations?.()
    }
  }, [props.paused, reducedMotion, isMobile])

  return (
    <div
      ref={containerRef}
      className='home-gateway'
      aria-hidden='true'
      data-motion={!reducedMotion}
      data-paused={props.paused ?? false}
    >
      <GatewayDiagram
        namespace={`${id}-desktop`}
        layout={desktop}
        mobile={false}
        animated={!reducedMotion && !isMobile}
        reduced={reducedMotion}
        logo={props.logo}
        brand={props.brand}
        svgRef={desktopRef}
        height={dimensions.height}
      />
      <GatewayDiagram
        namespace={`${id}-mobile`}
        layout={MOBILE_LAYOUT}
        mobile
        animated={!reducedMotion && isMobile}
        reduced={reducedMotion}
        logo={props.logo}
        brand={props.brand}
        svgRef={mobileRef}
      />
    </div>
  )
}
