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
import { expect, test } from 'vitest'

import { HOME_CLIENTS } from '../home-clients'
import {
  buildGatewayLayout,
  gatewayPacketTiming,
  gatewayPointAt,
  joinGatewayPaths,
} from '../home-gateway-layout'
import { HOME_PROVIDERS } from '../model-providers'

const providers = HOME_PROVIDERS.map((provider) => provider.name)
const clients = HOME_CLIENTS.filter(
  (client) => client.name !== 'WorkBuddy'
).map((client) => client.name)

test.each([966, 1000, 1440])(
  'desktop width %s keeps every documented node outside the hub and inside the canvas',
  (width) => {
    const layout = buildGatewayLayout({
      mobile: false,
      providers,
      clients,
      width,
    })
    expect(layout.nodes).toHaveLength(providers.length + clients.length)
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x + node.width).toBeLessThanOrEqual(layout.width)
      expect(node.y - node.height / 2).toBeGreaterThanOrEqual(0)
      expect(node.y + node.height / 2).toBeLessThanOrEqual(layout.height)
      if (node.side === 'provider') {
        expect(node.x + node.width).toBeLessThan(
          layout.hub.x - layout.hubRadius
        )
      } else expect(node.x).toBeGreaterThan(layout.hub.x + layout.hubRadius)
    }
    for (const route of layout.connections) {
      expect(route.path.d).not.toMatch(/NaN|Infinity/)
      expect(route.path.length).toBeGreaterThan(0)
      expect(gatewayPointAt(route.path, 0)).toEqual(route.path.points[0])
      expect(gatewayPointAt(route.path, route.path.length)).toEqual(
        route.path.points.at(-1)
      )
    }
  }
)

test('the mobile canvas puts alternating nodes before and after the four hub tiles', () => {
  const layout = buildGatewayLayout({ mobile: true, providers, clients })
  expect(layout.width).toBe(360)
  expect(layout.height).toBe(620)
  for (const node of layout.nodes) {
    expect(node.x).toBeGreaterThanOrEqual(0)
    expect(node.x + node.width).toBeLessThanOrEqual(layout.width)
    if (node.side === 'provider') {
      expect(node.y + node.height / 2).toBeLessThan(
        layout.hub.y - layout.hubRadius
      )
    } else {
      expect(node.y - node.height / 2).toBeGreaterThan(
        layout.hub.y + layout.hubRadius
      )
    }
  }
})

test.each([false, true])(
  'through packets hide while crossing the hub and labels for mobile=%s',
  (mobile) => {
    const layout = buildGatewayLayout({ mobile, providers, clients })
    const incoming = layout.connections.find((route) => !route.outgoing)
    const outgoing = layout.connections.find((route) => route.outgoing)
    if (!incoming || !outgoing) throw new Error('Missing gateway route')
    const path = joinGatewayPaths(incoming.path, outgoing.path)
    const timing = gatewayPacketTiming(path, layout, 80, 20)
    expect(timing).not.toBeNull()
    if (!timing) return
    const times = timing.keyTimes.split(';').map(Number)
    const values = timing.values.split(';').map(Number)
    expect(times).toHaveLength(values.length)
    expect(times[0]).toBe(0)
    expect(times.at(-1)).toBe(1)
    for (let index = 1; index < times.length; index++) {
      expect(times[index]).toBeGreaterThanOrEqual(times[index - 1])
      if (values[index] !== 1) continue
      const point = gatewayPointAt(path, times[index] * path.length)
      const distance =
        Math.max(0, Math.abs(point.x - layout.hub.x) - 40) +
        Math.max(0, Math.abs(point.y - layout.hub.y) - 10)
      expect(distance).toBeGreaterThan(layout.hubRadius)
      for (const node of layout.nodes) {
        const intersects =
          point.x + 40 > node.x &&
          point.x - 40 < node.x + node.width &&
          point.y + 10 > node.y - node.height / 2 &&
          point.y - 10 < node.y + node.height / 2
        expect(intersects).toBe(false)
      }
    }
  }
)

test('an oversized translated packet is omitted instead of covering the diagram', () => {
  const layout = buildGatewayLayout({ mobile: true, providers, clients })
  expect(
    gatewayPacketTiming(layout.connections[0].path, layout, 400, 20)
  ).toBeNull()
})
