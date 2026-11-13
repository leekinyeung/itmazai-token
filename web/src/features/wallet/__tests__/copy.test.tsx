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
import { act, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { BillingHistoryDialog } from '@/features/wallet/components/dialogs/billing-history-dialog'
import en from '@/i18n/locales/en.json'
import zh from '@/i18n/locales/zh.json'
import { api } from '@/lib/api'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { CreemProductsSection } from '../components/creem-products-section'
import { PaymentConfirmDialog } from '../components/dialogs/payment-confirm-dialog'
import { RechargeFormCard } from '../components/recharge-form-card'

const i18n = createInstance()

beforeEach(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'zh',
    fallbackLng: false,
    nsSeparator: false,
    resources: { en, zh },
    interpolation: { escapeValue: false },
  })
  useSystemConfigStore.getState().setConfig({
    currency: { ...DEFAULT_CURRENCY_CONFIG },
  })
})

afterEach(() => {
  useSystemConfigStore.getState().setConfig({
    currency: { ...DEFAULT_CURRENCY_CONFIG },
  })
})

it('translates billing history statuses and updates them when the language changes', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        total: 3,
        items: ['success', 'pending', 'expired'].map((status, id) => ({
          id,
          status,
          amount: 10,
          money: 10,
          trade_no: `order-${id}`,
          payment_method: 'stripe',
          create_time: 1,
        })),
      },
    },
  })
  render(
    <I18nextProvider i18n={i18n}>
      <BillingHistoryDialog open onOpenChange={vi.fn()} />
    </I18nextProvider>
  )
  await screen.findByText('order-0')
  for (const label of ['成功', '待确认', '已过期']) {
    expect(screen.getByText(label)).toBeVisible()
  }
  await act(() => i18n.changeLanguage('en'))
  for (const label of ['Success', 'Pending', 'Expired']) {
    expect(screen.getByText(label)).toBeVisible()
  }
})

it.each([
  { priceRatio: 7.3, paid: '584', saved: '146', full: '146' },
  { priceRatio: 0.000123, paid: '0.0098', saved: '0.0025', full: '0.0025' },
])(
  'translates recharge presets and minimum amount without changing precision at price ratio $priceRatio',
  async ({ priceRatio, paid, saved, full }) => {
    render(
      <I18nextProvider i18n={i18n}>
        <RechargeFormCard
          topupInfo={{
            enable_online_topup: true,
            enable_stripe_topup: false,
            pay_methods: [],
            min_topup: 1,
            stripe_min_topup: 1,
            amount_options: [100, 20],
            discount: {},
          }}
          presetAmounts={[{ value: 100, discount: 0.8 }, { value: 20 }]}
          selectedPreset={null}
          topupAmount={1}
          paymentAmount={priceRatio}
          priceRatio={priceRatio}
          calculating={false}
          paymentLoading={null}
          redemptionCode=''
          redeeming={false}
          onSelectPreset={vi.fn()}
          onTopupAmountChange={vi.fn()}
          onPaymentMethodSelect={vi.fn()}
          onRedemptionCodeChange={vi.fn()}
          onRedeem={vi.fn()}
        />
      </I18nextProvider>
    )
    expect(screen.getByRole('button', { name: /^\$100 / })).toHaveTextContent(
      `优惠 20%支付 $${paid} • 节省 $${saved}`
    )
    expect(screen.getByRole('button', { name: /^\$20 / })).toHaveTextContent(
      `支付 $${full}`
    )
    expect(screen.getByPlaceholderText('最低 1')).toBeVisible()
    await act(() => i18n.changeLanguage('en'))
    expect(screen.getByRole('button', { name: /^\$100 / })).toHaveTextContent(
      `20% OFFPay $${paid} • Save $${saved}`
    )
    expect(screen.getByRole('button', { name: /^\$20 / })).toHaveTextContent(
      `Pay $${full}`
    )
    expect(screen.getByPlaceholderText('Minimum 1')).toBeVisible()
  }
)

it.each([
  {
    name: 'USD',
    currency: { ...DEFAULT_CURRENCY_CONFIG },
    presetValue: 10,
    paymentAmount: 6.5,
    topupText: '$10',
    paymentText: '$6.5',
    displayUnit: 'USD',
    inputUnit: 'USD',
  },
  {
    name: 'CNY',
    currency: {
      ...DEFAULT_CURRENCY_CONFIG,
      quotaDisplayType: 'CNY' as const,
      usdExchangeRate: 7.2,
    },
    presetValue: 10,
    paymentAmount: 65,
    topupText: '¥72',
    paymentText: '¥65',
    displayUnit: 'CNY',
    inputUnit: 'USD',
  },
  {
    name: 'custom currency',
    currency: {
      ...DEFAULT_CURRENCY_CONFIG,
      quotaDisplayType: 'CUSTOM' as const,
      usdExchangeRate: 7.2,
      customCurrencySymbol: 'HK$',
      customCurrencyExchangeRate: 7.8,
    },
    presetValue: 10,
    paymentAmount: 65,
    topupText: 'HK$ 78',
    paymentText: 'HK$ 65',
    displayUnit: 'HK$',
    inputUnit: 'USD',
  },
  {
    name: 'tokens',
    currency: {
      ...DEFAULT_CURRENCY_CONFIG,
      quotaDisplayType: 'TOKENS' as const,
    },
    presetValue: 500000,
    paymentAmount: 1,
    topupText: '500,000 Tokens',
    paymentText: '$1',
    displayUnit: 'Tokens',
    inputUnit: 'Tokens',
  },
])(
  'shows configured currency units for recharge amounts in $name mode',
  async ({
    currency,
    presetValue,
    paymentAmount,
    topupText,
    paymentText,
    displayUnit,
    inputUnit,
  }) => {
    await act(() => i18n.changeLanguage('en'))
    useSystemConfigStore.getState().setConfig({ currency })

    render(
      <I18nextProvider i18n={i18n}>
        <RechargeFormCard
          topupInfo={{
            enable_online_topup: true,
            enable_stripe_topup: false,
            pay_methods: [],
            min_topup: 1,
            stripe_min_topup: 1,
            amount_options: [presetValue],
            discount: {},
          }}
          presetAmounts={[{ value: presetValue }]}
          selectedPreset={null}
          topupAmount={presetValue}
          paymentAmount={paymentAmount}
          priceRatio={1}
          calculating={false}
          paymentLoading={null}
          redemptionCode=''
          redeeming={false}
          onSelectPreset={vi.fn()}
          onTopupAmountChange={vi.fn()}
          onPaymentMethodSelect={vi.fn()}
          onRedemptionCodeChange={vi.fn()}
          onRedeem={vi.fn()}
        />
      </I18nextProvider>
    )

    expect(
      screen.getByRole('button', {
        name: (accessibleName) => accessibleName.includes(topupText),
      })
    ).toBeVisible()
    expect(screen.getAllByText(paymentText).length).toBeGreaterThan(0)
    expect(screen.getByText(`Amount (${displayUnit})`)).toBeVisible()
    expect(
      screen.getByRole('spinbutton', {
        name: `Custom Amount (${inputUnit})`,
      })
    ).toBeVisible()
  }
)

it('includes the request currency in payment-method minimum amounts', async () => {
  await act(() => i18n.changeLanguage('en'))
  useSystemConfigStore.getState().setConfig({
    currency: {
      ...DEFAULT_CURRENCY_CONFIG,
      quotaDisplayType: 'CNY',
      usdExchangeRate: 7.2,
    },
  })

  render(
    <I18nextProvider i18n={i18n}>
      <RechargeFormCard
        topupInfo={{
          enable_online_topup: true,
          enable_stripe_topup: false,
          pay_methods: [{ name: 'Card', type: 'card', min_topup: 20 }],
          min_topup: 1,
          stripe_min_topup: 1,
          amount_options: [],
          discount: {},
        }}
        presetAmounts={[]}
        selectedPreset={null}
        topupAmount={10}
        paymentAmount={72}
        calculating={false}
        paymentLoading={null}
        redemptionCode=''
        redeeming={false}
        onSelectPreset={vi.fn()}
        onTopupAmountChange={vi.fn()}
        onPaymentMethodSelect={vi.fn()}
        onRedemptionCodeChange={vi.fn()}
        onRedeem={vi.fn()}
      />
    </I18nextProvider>
  )

  expect(
    screen.getByRole('button', {
      name: 'Card. Minimum topup amount: 20 USD',
    })
  ).toHaveTextContent('Minimum: 20 USD')
})

it('shows currency units throughout the payment confirmation', async () => {
  await act(() => i18n.changeLanguage('en'))
  useSystemConfigStore.getState().setConfig({
    currency: {
      ...DEFAULT_CURRENCY_CONFIG,
      quotaDisplayType: 'CNY',
      usdExchangeRate: 7.2,
    },
  })

  render(
    <I18nextProvider i18n={i18n}>
      <PaymentConfirmDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={10}
        paymentAmount={52}
        paymentMethod={{ name: 'Card', type: 'card' }}
        calculating={false}
        processing={false}
        discountRate={0.8}
      />
    </I18nextProvider>
  )

  expect(screen.getByText('¥72')).toBeVisible()
  expect(screen.getByText('¥52')).toBeVisible()
  expect(screen.getByText('¥65')).toBeVisible()
  expect(screen.getByText('¥13')).toBeVisible()
})

it('formats Creem credited quota with the configured display currency', async () => {
  await act(() => i18n.changeLanguage('en'))
  useSystemConfigStore.getState().setConfig({
    currency: {
      ...DEFAULT_CURRENCY_CONFIG,
      quotaDisplayType: 'CNY',
      usdExchangeRate: 7.2,
    },
  })

  render(
    <I18nextProvider i18n={i18n}>
      <CreemProductsSection
        products={[
          {
            name: 'Starter',
            productId: 'starter',
            price: 9.99,
            currency: 'USD',
            quota: 500000,
          },
        ]}
        onProductSelect={vi.fn()}
      />
    </I18nextProvider>
  )

  expect(screen.getByText('Quota: ¥7.2')).toBeVisible()
  expect(screen.getByText('$9.99')).toBeVisible()
})
