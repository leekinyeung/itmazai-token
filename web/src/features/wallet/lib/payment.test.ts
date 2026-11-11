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
import { describe, expect, test } from 'vitest'

import { PAYMENT_TYPES } from '../constants'
import type { TopupInfo } from '../types'
import {
  dispatchSelectedPayment,
  getMinTopupAmount,
  isDodoPayment,
  isStripePayment,
  isWaffoPayment,
  isWaffoPancakePayment,
} from './payment'

describe('payment type classification', () => {
  test('keeps Waffo and Waffo Pancake on their dedicated flows', () => {
    expect(isWaffoPayment(PAYMENT_TYPES.WAFFO)).toBe(true)
    expect(isWaffoPayment(PAYMENT_TYPES.WAFFO_PANCAKE)).toBe(false)
    expect(isWaffoPancakePayment(PAYMENT_TYPES.WAFFO_PANCAKE)).toBe(true)
    expect(isWaffoPancakePayment(PAYMENT_TYPES.WAFFO)).toBe(false)
    expect(isStripePayment(PAYMENT_TYPES.STRIPE)).toBe(true)
  })

  test('classifies Dodo without routing it to another gateway flow', () => {
    expect(isDodoPayment(PAYMENT_TYPES.DODO)).toBe(true)
    expect(isDodoPayment(PAYMENT_TYPES.CREEM)).toBe(false)
    expect(isWaffoPayment(PAYMENT_TYPES.DODO)).toBe(false)
  })
})

describe('minimum top-up for Dodo Payments', () => {
  test('uses the Dodo minimum when only Dodo is enabled', () => {
    const topupInfo = {
      enable_online_topup: false,
      enable_stripe_topup: false,
      enable_dodo_topup: true,
      dodo_min_topup: 5,
    } as TopupInfo

    expect(getMinTopupAmount(topupInfo)).toBe(5)
  })
})

describe('payment dispatch', () => {
  test('keeps the selected Waffo method index through confirmation', async () => {
    const calls: string[] = []
    const success = await dispatchSelectedPayment(
      { name: 'Waffo Card', type: PAYMENT_TYPES.WAFFO },
      120,
      3,
      {
        regular: async () => {
          calls.push('regular')
          return false
        },
        waffo: async (amount, index) => {
          calls.push(`waffo:${amount}:${index}`)
          return true
        },
        waffoPancake: async () => {
          calls.push('pancake')
          return false
        },
      }
    )

    expect(success).toBe(true)
    expect(calls).toEqual(['waffo:120:3'])
  })

  test('routes Dodo through the regular confirmation flow', async () => {
    const calls: string[] = []
    const success = await dispatchSelectedPayment(
      { name: 'Dodo Payments', type: PAYMENT_TYPES.DODO },
      50,
      null,
      {
        regular: async (amount, type) => {
          calls.push(`regular:${amount}:${type}`)
          return true
        },
        waffo: async () => false,
        waffoPancake: async () => false,
      }
    )

    expect(success).toBe(true)
    expect(calls).toEqual(['regular:50:dodo'])
  })

  test('does not create a Waffo order without a selected method index', async () => {
    let called = false
    const success = await dispatchSelectedPayment(
      { name: 'Waffo Card', type: PAYMENT_TYPES.WAFFO },
      120,
      null,
      {
        regular: async () => false,
        waffo: async () => {
          called = true
          return true
        },
        waffoPancake: async () => false,
      }
    )

    expect(success).toBe(false)
    expect(called).toBe(false)
  })
})
