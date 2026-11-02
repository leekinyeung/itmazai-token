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
import { Check } from 'lucide-react'

import {
  gatewayPacketTiming,
  type GatewayLayout,
  type GatewayPath,
} from '../home-gateway-layout'

const TRAILS = [
  { length: 0.22, width: 5, opacity: 0.12 },
  { length: 0.16, width: 1.4, opacity: 0.5 },
  { length: 0.05, width: 1.8, opacity: 1 },
]

export function GatewayConnection(props: {
  id: string
  path: GatewayPath
  outgoing: boolean
  delay: number
  animated: boolean
}) {
  return (
    <g className='home-gateway-connection' data-outgoing={props.outgoing}>
      <path id={props.id} className='home-gateway-track' d={props.path.d} />
      {props.animated &&
        (props.outgoing ? (
          <g opacity={0}>
            <animate
              attributeName='opacity'
              values='0;1;1;0;0'
              keyTimes='0;0.02;0.3;0.42;1'
              dur='6s'
              begin={`${props.delay}s`}
              repeatCount='indefinite'
            />
            {[
              { width: 5, opacity: 0.18 },
              { width: 1.4, opacity: 1 },
            ].map((stroke) => (
              <path
                key={stroke.width}
                d={props.path.d}
                pathLength={1}
                stroke='currentColor'
                strokeWidth={stroke.width}
                strokeOpacity={stroke.opacity}
                strokeLinecap='round'
                strokeDasharray='1 2'
                strokeDashoffset={1}
              >
                <animate
                  attributeName='stroke-dashoffset'
                  values='1;0;0'
                  keyTimes='0;0.18;1'
                  dur='6s'
                  begin={`${props.delay}s`}
                  repeatCount='indefinite'
                />
              </path>
            ))}
          </g>
        ) : (
          TRAILS.map((trail) => (
            <path
              key={trail.length}
              d={props.path.d}
              pathLength={1}
              stroke='currentColor'
              strokeWidth={trail.width}
              strokeOpacity={trail.opacity}
              strokeLinecap='round'
              strokeDasharray={`${trail.length} ${1.16 - trail.length}`}
              strokeDashoffset={trail.length}
            >
              <animate
                attributeName='stroke-dashoffset'
                from={trail.length}
                to={trail.length - 1.16}
                dur='2.8s'
                begin={`${props.delay}s`}
                repeatCount='indefinite'
              />
            </path>
          ))
        ))}
    </g>
  )
}

export function GatewayPacket(props: {
  pathId: string
  path: GatewayPath
  layout: GatewayLayout
  label?: string
  tone?: 'plain' | 'ok' | 'warn'
  delay: number
  duration: number
  animated: boolean
}) {
  const tone = props.tone ?? 'ok'
  const label = props.label
  const hasIcon = tone !== 'plain'
  const textWidth = [...(label ?? '')].reduce(
    (sum, character) =>
      sum +
      (/[\u2e80-\u9fff\uac00-\ud7af\u3040-\u30ff]/.test(character) ? 9 : 6.5),
    0
  )
  const width = label ? Math.ceil(textWidth + (hasIcon ? 34 : 20)) : 22
  const timing = gatewayPacketTiming(
    props.path,
    props.layout,
    width,
    label ? 20 : 22
  )
  if (!timing) return null
  return (
    <g
      className='home-gateway-packet'
      data-tone={tone}
      opacity={props.animated ? 0 : 1}
      transform={
        props.animated
          ? undefined
          : `translate(${timing.staticPosition.x}, ${timing.staticPosition.y})`
      }
    >
      {props.animated && (
        <>
          <animateMotion
            dur={`${props.duration}s`}
            begin={`${props.delay}s`}
            repeatCount='indefinite'
            calcMode='linear'
          >
            <mpath href={`#${props.pathId}`} />
          </animateMotion>
          <animate
            attributeName='opacity'
            values={timing.values}
            keyTimes={timing.keyTimes}
            dur={`${props.duration}s`}
            begin={`${props.delay}s`}
            repeatCount='indefinite'
          />
        </>
      )}
      {label ? (
        <>
          <rect x={-width / 2} y={-10} width={width} height={20} rx={10} />
          {hasIcon && (
            <g transform={`translate(${-width / 2 + 13}, 0)`}>
              {tone === 'warn' ? (
                <>
                  <rect
                    className='home-gateway-warning'
                    x={-4.6}
                    y={-4.6}
                    width={9.2}
                    height={9.2}
                    rx={1.5}
                    transform='rotate(45)'
                  />
                  <path
                    d='M 0 -2.4 V 0.6 M 0 2.2 V 2.6'
                    stroke='currentColor'
                    strokeWidth={1.3}
                    strokeLinecap='round'
                  />
                </>
              ) : (
                <>
                  <circle r={5.5} fill='currentColor' />
                  <Check
                    x={-4}
                    y={-4}
                    size={8}
                    color='var(--background)'
                    strokeWidth={2.5}
                  />
                </>
              )}
            </g>
          )}
          <text x={-width / 2 + (hasIcon ? 24 : 10)} y={3.5}>
            {label}
          </text>
        </>
      ) : (
        <>
          <circle r={11} fill='currentColor' opacity={0.18} />
          <circle r={6.5} fill='currentColor' />
          <Check
            x={-4.5}
            y={-4.5}
            size={9}
            color='var(--background)'
            strokeWidth={2.5}
          />
        </>
      )}
    </g>
  )
}
