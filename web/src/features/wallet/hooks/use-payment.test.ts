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
import { renderHook } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { PAYMENT_TYPES } from '../constants'
import {
  requestPaymentAmount,
  usePayment,
  type PaymentAmountCalculators,
} from './use-payment'

const calculators = (
  calls: string[],
  dodoAmount = '18.75'
): PaymentAmountCalculators => ({
  regular: async () => {
    calls.push('regular')
    return { success: true, data: '1' }
  },
  stripe: async () => {
    calls.push('stripe')
    return { success: true, data: '2' }
  },
  dodo: async (request) => {
    calls.push(`dodo:${request.amount}`)
    return { success: true, data: dodoAmount }
  },
  waffo: async (request) => {
    calls.push(`waffo:${request.amount}`)
    return { success: true, data: '18.75' }
  },
  waffoPancake: async () => {
    calls.push('pancake')
    return { success: true, data: '4' }
  },
})

describe('payment amount routing', () => {
  test('uses the dedicated Waffo amount calculator', async () => {
    const calls: string[] = []
    const amount = await requestPaymentAmount(
      120,
      PAYMENT_TYPES.WAFFO,
      calculators(calls)
    )

    expect(amount).toBe(18.75)
    expect(calls).toEqual(['waffo:120'])
  })

  test('uses the dedicated Dodo amount calculator', async () => {
    const calls: string[] = []
    const amount = await requestPaymentAmount(
      120,
      PAYMENT_TYPES.DODO,
      calculators(calls, '12.50')
    )

    expect(amount).toBe(12.5)
    expect(calls).toEqual(['dodo:120'])
  })
})

describe('Dodo checkout', () => {
  test('opens the hosted checkout returned by the server', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        message: 'success',
        data: { checkout_url: 'https://checkout.example.com/session' },
      },
    })
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)

    const { result } = renderHook(() => usePayment())
    const success = await result.current.processPayment(50, PAYMENT_TYPES.DODO)

    expect(success).toBe(true)
    expect(post).toHaveBeenCalledWith(
      '/api/user/dodo/pay',
      { amount: 50, payment_method: 'dodo' },
      expect.objectContaining({ skipBusinessError: true })
    )
    expect(open).toHaveBeenCalledWith(
      'https://checkout.example.com/session',
      '_blank'
    )
    post.mockRestore()
    open.mockRestore()
  })

  test('does not open a checkout when the server rejects the request', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: { message: 'error', data: 'Payment amount is too low' },
    })
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)

    const { result } = renderHook(() => usePayment())
    const success = await result.current.processPayment(50, PAYMENT_TYPES.DODO)

    expect(success).toBe(false)
    expect(open).not.toHaveBeenCalled()
    post.mockRestore()
    open.mockRestore()
  })
})
