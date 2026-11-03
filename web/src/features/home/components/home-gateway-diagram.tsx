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
import type { Ref } from 'react'
import { useTranslation } from 'react-i18next'

import { HOME_GATEWAY_CLIENTS } from '../home-clients'
import {
  GATEWAY_TILE_OFFSET,
  joinGatewayPaths,
  type GatewayLayout,
} from '../home-gateway-layout'
import { HOME_PROVIDERS } from '../model-providers'
import { GatewayConnection, GatewayPacket } from './home-gateway-motion'

export function GatewayDiagram(props: {
  namespace: string
  layout: GatewayLayout
  mobile: boolean
  animated: boolean
  reduced: boolean
  logo: string
  brand: string
  svgRef: Ref<SVGSVGElement>
  height?: number
}) {
  const { t } = useTranslation()
  const layout = props.layout
  const incoming = layout.connections.filter(
    (connection) => !connection.outgoing
  )
  const outgoing = layout.connections.filter(
    (connection) => connection.outgoing
  )
  const throughSpecs = props.mobile
    ? [
        {
          from: 0,
          to: 4,
          label: t('Tool calls'),
          tone: 'ok' as const,
          delay: 0,
        },
        {
          from: 3,
          to: 1,
          label: t('Streaming'),
          tone: 'ok' as const,
          delay: 3.6,
        },
      ]
    : [
        {
          from: 0,
          to: 0,
          label: t('Tool calls'),
          tone: 'ok' as const,
          delay: 0,
        },
        {
          from: 3,
          to: 2,
          label: t('Tokens'),
          tone: 'plain' as const,
          delay: 2.4,
        },
        {
          from: 5,
          to: 4,
          label: t('Streaming'),
          tone: 'ok' as const,
          delay: 4.8,
        },
      ]
  const through = throughSpecs.flatMap((spec) => {
    const first = incoming[spec.from]
    const last = outgoing[spec.to]
    return first && last
      ? [
          {
            ...spec,
            key: `${first.key}-${last.key}`,
            path: joinGatewayPaths(first.path, last.path),
          },
        ]
      : []
  })
  const riders = props.mobile
    ? [
        {
          key: incoming[4]?.key,
          label: t('Rate limit'),
          tone: 'warn' as const,
          delay: 1.8,
          duration: 3.6,
        },
        { key: incoming[1]?.key, delay: 0, duration: 3.6 },
        { key: outgoing[2]?.key, delay: 1.5, duration: 2.4 },
        { key: outgoing[3]?.key, delay: 0.3, duration: 2.4 },
      ]
    : [
        { key: incoming[1]?.key, delay: 0.9, duration: 3.6 },
        {
          key: incoming[2]?.key,
          label: '200 OK',
          tone: 'ok' as const,
          delay: 2.7,
          duration: 3.6,
        },
        {
          key: incoming[4]?.key,
          label: t('Rate limit'),
          tone: 'warn' as const,
          delay: 0.3,
          duration: 3.6,
        },
        { key: incoming[5]?.key, delay: 2.1, duration: 3.6 },
        { key: outgoing[1]?.key, delay: 1.2, duration: 2.4 },
        {
          key: outgoing[3]?.key,
          label: t('Cache hit'),
          tone: 'ok' as const,
          delay: 0.1,
          duration: 2.4,
        },
      ]
  const tiles = [
    {
      key: 'models',
      x: 0,
      y: -GATEWAY_TILE_OFFSET,
      label: t('Models'),
      dx: 0,
    },
    {
      key: 'routing',
      x: -GATEWAY_TILE_OFFSET,
      y: 0,
      label: t('Routing'),
      dx: -8,
    },
    {
      key: 'api',
      x: GATEWAY_TILE_OFFSET,
      y: 0,
      label: t('Unified API'),
      dx: 8,
    },
    {
      key: 'logs',
      x: 0,
      y: GATEWAY_TILE_OFFSET,
      label: t('Logs'),
      dx: 0,
    },
  ]
  return (
    <svg
      ref={props.svgRef}
      className={
        props.mobile ? 'home-gateway-lines-mobile' : 'home-gateway-lines'
      }
      data-flow={props.mobile ? 'mobile' : 'desktop'}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      focusable='false'
      style={props.mobile ? undefined : { height: props.height }}
    >
      <title>{props.brand}</title>
      <defs>
        <linearGradient
          id={`${props.namespace}-tile`}
          x1='0'
          x2='1'
          y1='0'
          y2='1'
        >
          <stop offset='0%' stopColor='var(--card)' />
          <stop offset='100%' stopColor='var(--muted)' />
        </linearGradient>
        <radialGradient id={`${props.namespace}-glow`}>
          <stop offset='0%' stopColor='var(--primary)' stopOpacity={0.18} />
          <stop offset='50%' stopColor='var(--primary)' stopOpacity={0.08} />
          <stop offset='100%' stopColor='var(--primary)' stopOpacity={0} />
        </radialGradient>
        {through.map((route) => (
          <path
            key={route.key}
            id={`${props.namespace}-through-${route.key}`}
            d={route.path.d}
          />
        ))}
      </defs>
      <circle
        cx={layout.hub.x}
        cy={layout.hub.y}
        r={props.mobile ? 180 : 200}
        fill={`url(#${props.namespace}-glow)`}
      />
      {layout.connections.map((connection) => (
        <GatewayConnection
          key={connection.key}
          id={`${props.namespace}-${connection.key}`}
          path={connection.path}
          outgoing={connection.outgoing}
          delay={connection.delay}
          animated={props.animated}
        />
      ))}
      {props.animated &&
        through.map((route) => (
          <GatewayPacket
            key={route.key}
            pathId={`${props.namespace}-through-${route.key}`}
            path={route.path}
            layout={layout}
            label={route.label}
            tone={route.tone}
            delay={route.delay}
            duration={7.2}
            animated
          />
        ))}
      {(props.animated || props.reduced) &&
        riders.map((rider, index) => {
          const connection = layout.connections.find(
            (candidate) => candidate.key === rider.key
          )
          if (!connection || (props.reduced && props.mobile && index > 1)) {
            return null
          }
          return (
            <GatewayPacket
              key={connection.key}
              pathId={`${props.namespace}-${connection.key}`}
              path={connection.path}
              layout={layout}
              label={rider.label}
              tone={rider.tone}
              delay={rider.delay}
              duration={rider.duration}
              animated={props.animated}
            />
          )
        })}
      {layout.nodes.map((node) => {
        const item =
          node.side === 'provider'
            ? HOME_PROVIDERS[node.index]
            : HOME_GATEWAY_CLIENTS[node.index]
        const textX = node.padding + node.glyph + 8
        return (
          <g
            className='home-gateway-node'
            key={`${node.side}-${node.name}`}
            data-side={node.side}
            transform={`translate(${node.x}, ${node.y - node.height / 2})`}
          >
            <rect
              x={0.5}
              y={0.5}
              width={node.width - 1}
              height={node.height - 1}
              rx={(node.height - 1) / 2}
            />
            <g
              transform={`translate(${node.padding}, ${(node.height - node.glyph) / 2})`}
            >
              {'icon' in item ? (
                <item.icon size={node.glyph} />
              ) : (
                <text
                  x={node.glyph / 2}
                  y={node.glyph - 2}
                  textAnchor='middle'
                  fontSize={node.glyph}
                >
                  {item.initials}
                </text>
              )}
            </g>
            <text
              className='home-gateway-node-label'
              x={textX}
              y={node.height / 2 + 0.36 * node.font}
              fontSize={node.font}
            >
              {node.name}
            </text>
          </g>
        )
      })}
      <g
        className='home-gateway-hub'
        transform={`translate(${layout.hub.x}, ${layout.hub.y})`}
      >
        {tiles.map((tile) => (
          <g
            key={tile.key}
            data-hub-tile={tile.key}
            transform={`translate(${tile.x}, ${tile.y})`}
          >
            <rect
              x={-42}
              y={-42}
              width={84}
              height={84}
              rx={10}
              transform='rotate(45)'
              fill={`url(#${props.namespace}-tile)`}
            />
            <text
              x={tile.dx}
              y={3.5}
              textAnchor='middle'
              textLength={[...tile.label].length * 6.8 > 80 ? 80 : undefined}
              lengthAdjust='spacingAndGlyphs'
            >
              {tile.label}
            </text>
          </g>
        ))}
        <circle
          className='home-gateway-halo'
          r={34}
          fill='var(--primary)'
          fillOpacity={0.12}
        />
        <circle
          r={28}
          fill='var(--background)'
          stroke='var(--primary)'
          strokeOpacity={0.6}
          strokeWidth={1.5}
        />
        <image
          href={props.logo}
          x={-20}
          y={-20}
          width={40}
          height={40}
          aria-label={props.brand}
        />
      </g>
    </svg>
  )
}
