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
import type { TFunction } from 'i18next'

import {
  formatCurrencyFromUSD,
  getCurrencyDisplay,
  type CurrencyFormatOptions,
} from '@/lib/currency'
import { formatNumber } from '@/lib/format'

import { DEFAULT_DISCOUNT_RATE } from '../constants'

// ============================================================================
// Wallet-specific Formatting Functions
// ============================================================================

/**
 * Format Creem price with currency symbol (USD/EUR)
 */
export function formatCreemPrice(
  price: number,
  currency: 'USD' | 'EUR'
): string {
  const symbol = currency === 'EUR' ? '€' : '$'
  return `${symbol}${price.toFixed(2)}`
}

/**
 * Format large quota numbers with K/M suffix
 */
export function formatQuotaShort(quota: number): string {
  if (quota >= 1000000) {
    return `${(quota / 1000000).toFixed(1)}M`
  }
  if (quota >= 1000) {
    return `${(quota / 1000).toFixed(1)}K`
  }
  return quota.toString()
}

/** Format the wallet credit represented by a top-up request amount. */
export function formatTopupAmount(
  amount: number,
  t: TFunction,
  options?: CurrencyFormatOptions
): string {
  if (!Number.isFinite(amount)) return '-'

  const { meta } = getCurrencyDisplay()
  if (meta.kind === 'tokens') {
    return `${formatNumber(amount, options?.locale)} ${t('Tokens')}`
  }

  return formatCurrencyFromUSD(amount, options)
}

/** Return the unit accepted by the top-up amount API. */
export function getTopupRequestUnit(t: TFunction): string {
  const { meta } = getCurrencyDisplay()
  return meta.kind === 'tokens' ? t('Tokens') : t('USD')
}

/** Format a minimum or validation value in the top-up request unit. */
export function formatTopupRequestAmount(
  amount: number,
  t: TFunction,
  locale?: Intl.LocalesArgument
): string {
  return `${formatNumber(amount, locale)} ${getTopupRequestUnit(t)}`
}

/**
 * Get discount label for display (e.g., "20% OFF")
 */
export function getDiscountLabel(discount: number, t: TFunction): string {
  if (discount >= DEFAULT_DISCOUNT_RATE) {
    return ''
  }
  const off = Math.round((1 - discount) * 100)
  return t('{{percent}}% OFF', { percent: off })
}

/**
 * Calculate pricing details for a preset amount
 */
export function calculatePresetPricing(
  presetValue: number,
  priceRatio: number,
  discount: number
) {
  const originalPrice = presetValue * priceRatio
  const actualPrice = originalPrice * discount
  const savedAmount = originalPrice - actualPrice
  const hasDiscount = discount < 1.0

  return {
    originalPrice,
    actualPrice,
    savedAmount,
    hasDiscount,
  }
}
