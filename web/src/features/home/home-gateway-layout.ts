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
export interface GatewayPoint {
  x: number
  y: number
}
export interface GatewayPath {
  d: string
  points: GatewayPoint[]
  distances: number[]
  length: number
}
export interface GatewayNode {
  name: string
  index: number
  side: 'provider' | 'client'
  x: number
  y: number
  width: number
  height: number
  font: number
  glyph: number
  padding: number
}
export interface GatewayConnection {
  key: string
  path: GatewayPath
  outgoing: boolean
  delay: number
}
export interface GatewayLayout {
  mobile: boolean
  width: number
  height: number
  hub: GatewayPoint
  hubRadius: number
  nodes: GatewayNode[]
  connections: GatewayConnection[]
}

export const GATEWAY_TILE_OFFSET = 62
export const GATEWAY_HUB_RADIUS = 62 + 84 / Math.SQRT2

function gatewayPath(d: string, points: GatewayPoint[]): GatewayPath {
  const distances = [0]
  for (let index = 1; index < points.length; index++) {
    distances.push(
      distances[index - 1] +
        Math.hypot(
          points[index].x - points[index - 1].x,
          points[index].y - points[index - 1].y
        )
    )
  }
  return { d, points, distances, length: distances.at(-1) ?? 0 }
}

function roundedGatewayPath(
  points: GatewayPoint[],
  radius: number
): GatewayPath {
  const unique = points.filter(
    (point, index) =>
      index === 0 ||
      Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y) >
        0.01
  )
  const corners = unique.filter((point, index) => {
    if (index === 0 || index === unique.length - 1) return true
    const previous = unique[index - 1]
    const next = unique[index + 1]
    return (
      Math.abs(
        (point.x - previous.x) * (next.y - point.y) -
          (point.y - previous.y) * (next.x - point.x)
      ) > 0.01
    )
  })
  let d = `M ${corners[0].x} ${corners[0].y}`
  const samples = [corners[0]]
  for (let index = 1; index < corners.length - 1; index++) {
    const previous = corners[index - 1]
    const corner = corners[index]
    const next = corners[index + 1]
    const before = Math.hypot(corner.x - previous.x, corner.y - previous.y)
    const after = Math.hypot(next.x - corner.x, next.y - corner.y)
    const bend = Math.min(radius, before / 2, after / 2)
    const entry = {
      x: corner.x + ((previous.x - corner.x) * bend) / before,
      y: corner.y + ((previous.y - corner.y) * bend) / before,
    }
    const exit = {
      x: corner.x + ((next.x - corner.x) * bend) / after,
      y: corner.y + ((next.y - corner.y) * bend) / after,
    }
    d += ` L ${entry.x.toFixed(2)} ${entry.y.toFixed(2)} Q ${corner.x.toFixed(2)} ${corner.y.toFixed(2)} ${exit.x.toFixed(2)} ${exit.y.toFixed(2)}`
    samples.push(entry)
    for (let step = 1; step <= 10; step++) {
      const t = step / 10
      samples.push({
        x:
          (1 - t) ** 2 * entry.x + 2 * (1 - t) * t * corner.x + t ** 2 * exit.x,
        y:
          (1 - t) ** 2 * entry.y + 2 * (1 - t) * t * corner.y + t ** 2 * exit.y,
      })
    }
  }
  const last = corners.at(-1) ?? corners[0]
  d += ` L ${last.x} ${last.y}`
  samples.push(last)
  return gatewayPath(d, samples)
}

export function joinGatewayPaths(
  first: GatewayPath,
  last: GatewayPath
): GatewayPath {
  return gatewayPath(`${first.d} ${last.d.replace(/^M/, 'L')}`, [
    ...first.points,
    ...last.points,
  ])
}

export function gatewayPointAt(
  path: GatewayPath,
  distance: number
): GatewayPoint {
  const target = Math.max(0, Math.min(path.length, distance))
  let end = 1
  while (end < path.distances.length - 1 && path.distances[end] < target) end++
  const startPoint = path.points[end - 1]
  const endPoint = path.points[end]
  const fraction =
    (target - path.distances[end - 1]) /
    (path.distances[end] - path.distances[end - 1] || 1)
  return {
    x: startPoint.x + (endPoint.x - startPoint.x) * fraction,
    y: startPoint.y + (endPoint.y - startPoint.y) * fraction,
  }
}

export function buildGatewayLayout(options: {
  mobile: boolean
  providers: readonly string[]
  clients: readonly string[]
  width?: number
}): GatewayLayout {
  const mobile = options.mobile
  const font = mobile ? 10 : 12
  const height = mobile ? 28 : 34
  const glyph = mobile ? 13 : 16
  const padding = Math.round(height * 0.4)
  const nodes: GatewayNode[] = []
  const connections: GatewayConnection[] = []
  const biggest = Math.max(
    0,
    ...[...options.providers, ...options.clients].map((name) =>
      Math.round(padding * 2 + glyph + 8 + name.length * font * 0.7)
    )
  )
  const width = mobile
    ? 360
    : Math.max(2 * (310 + biggest + 12), options.width ?? 1000)
  const hub = { x: width / 2, y: mobile ? 340 : 180 }
  const side = Math.min(420, Math.max(310, width / 2 - biggest - 12))
  for (const [kind, names] of [
    ['provider', options.providers],
    ['client', options.clients],
  ] as const) {
    for (const [index, name] of names.entries()) {
      const outgoing = kind === 'client'
      const nodeWidth = Math.round(
        padding * 2 + glyph + 8 + name.length * font * 0.7
      )
      let x: number
      let y: number
      let path: GatewayPath
      if (mobile) {
        const left = index % 2 === 0
        y = outgoing ? 520 + index * 20 : 20 + index * 20
        x = left ? 140 - nodeWidth : 220
        const edge = left ? 140 : 220
        if (outgoing) {
          path = roundedGatewayPath(
            [
              { x: hub.x, y: hub.y + GATEWAY_HUB_RADIUS - 4 },
              { x: hub.x, y },
              { x: edge, y },
            ],
            16
          )
        } else {
          const track =
            hub.x + (left ? -1 : 1) * (3.5 + 7 * Math.floor(index / 2))
          const end =
            hub.y -
            GATEWAY_TILE_OFFSET -
            (84 / Math.SQRT2 - Math.abs(track - hub.x)) +
            4
          path = roundedGatewayPath(
            [
              { x: edge, y },
              { x: track, y },
              { x: track, y: end },
            ],
            14
          )
        }
      } else {
        y = hub.y + (index - (names.length - 1) / 2) * (outgoing ? 66 : 56)
        const edge = hub.x + (outgoing ? side : -side)
        x = outgoing ? edge : edge - nodeWidth
        if (outgoing) {
          const turn = edge - 36
          path = roundedGatewayPath(
            [
              { x: hub.x + GATEWAY_HUB_RADIUS - 4, y: hub.y },
              { x: turn - 0.8 * Math.abs(y - hub.y), y: hub.y },
              { x: turn, y },
              { x: edge, y },
            ],
            30
          )
        } else {
          const trackY = hub.y + (index - (names.length - 1) / 2) * 7
          const left = hub.x - GATEWAY_HUB_RADIUS
          const fan = Math.max(
            0,
            Math.abs(index - (names.length - 1) / 2) - 0.5
          )
          const turn = left - 80 + 22 * fan
          path = roundedGatewayPath(
            [
              { x: edge, y },
              { x: turn - 0.75 * Math.abs(trackY - y), y },
              { x: turn, y: trackY },
              { x: left + Math.abs(trackY - hub.y) + 4, y: trackY },
            ],
            26
          )
        }
      }
      nodes.push({
        name,
        index,
        side: kind,
        x,
        y,
        width: nodeWidth,
        height,
        font,
        glyph,
        padding,
      })
      connections.push({
        key: `${kind}-${name.replaceAll(/\s+/g, '-')}`,
        path,
        outgoing,
        delay: outgoing ? index * (6 / options.clients.length) : index * 0.45,
      })
    }
  }
  return {
    mobile,
    width,
    height: mobile ? 620 : 360,
    hub,
    hubRadius: GATEWAY_HUB_RADIUS,
    nodes,
    connections,
  }
}

export function gatewayPacketTiming(
  path: GatewayPath,
  layout: GatewayLayout,
  width: number,
  height: number
) {
  const windows: { from: number; to: number }[] = []
  const leftEdge = Math.max(
    0,
    ...layout.nodes
      .filter((node) => node.side === 'provider')
      .map((node) => node.x + node.width)
  )
  const rightEdge = Math.min(
    layout.width,
    ...layout.nodes
      .filter((node) => node.side === 'client')
      .map((node) => node.x)
  )
  let start: number | undefined
  for (let distance = 0; distance <= path.length + 2; distance += 2) {
    const point = gatewayPointAt(path, Math.min(distance, path.length))
    const hubDistance =
      Math.max(0, Math.abs(point.x - layout.hub.x) - width / 2) +
      Math.max(0, Math.abs(point.y - layout.hub.y) - height / 2)
    const hitsNode = layout.nodes.some(
      (node) =>
        point.x + width / 2 > node.x - 4 &&
        point.x - width / 2 < node.x + node.width + 4 &&
        point.y + height / 2 > node.y - node.height / 2 - 4 &&
        point.y - height / 2 < node.y + node.height / 2 + 4
    )
    const desktopVisible =
      point.x - width / 2 > leftEdge + 6 &&
      point.x + width / 2 < rightEdge - 6 &&
      (point.x + width / 2 < layout.hub.x - layout.hubRadius - 22 ||
        point.x - width / 2 > layout.hub.x + layout.hubRadius + 46)
    const mobileVisible =
      point.x - width / 2 >= 0 &&
      point.x + width / 2 <= layout.width &&
      hubDistance >= layout.hubRadius + 4 &&
      !hitsNode
    const visible =
      distance <= path.length &&
      (layout.mobile ? mobileVisible : desktopVisible)
    if (visible && start === undefined) start = distance
    if (!visible && start !== undefined) {
      if (distance - start >= 48) {
        windows.push({ from: start, to: Math.min(distance - 2, path.length) })
      }
      start = undefined
    }
  }
  if (!windows.length) return null
  const times = [0]
  const values = [0]
  for (const window of windows) {
    const from = Math.max(1, window.from)
    const to = Math.min(path.length - 1, window.to)
    const fade = Math.min(24, (to - from) / 3)
    times.push(from, from + fade, to - fade, to)
    values.push(0, 1, 1, 0)
  }
  times.push(path.length)
  values.push(0)
  const widest = windows.reduce((best, window) =>
    window.to - window.from > best.to - best.from ? window : best
  )
  return {
    keyTimes: times.map((time) => (time / path.length).toFixed(4)).join(';'),
    values: values.join(';'),
    staticPosition: gatewayPointAt(path, (widest.from + widest.to) / 2),
  }
}
