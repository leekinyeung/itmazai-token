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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { SettingsPageProvider } from '../../components/settings-page-context'
import { PaymentSettingsSection } from '../payment-settings-section'

function Fixture() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const legacyProps = {
    complianceDefaults: {
      confirmed: false,
      termsVersion: '',
      confirmedAt: 0,
      confirmedBy: 0,
    },
  }
  return (
    <>
      <div ref={setContainer} />
      <SettingsPageProvider actionsContainer={container}>
        <PaymentSettingsSection
          {...legacyProps}
          defaultValues={{
            PayAddress: '',
            EpayId: '',
            EpayKey: '',
            Price: 7.3,
            MinTopUp: 1,
            CustomCallbackAddress: '',
            PayMethods: '[]',
            AmountOptions: '[10,20]',
            AmountDiscount: '{}',
            StripeApiSecret: '',
            StripeWebhookSecret: '',
            StripePriceId: '',
            StripeUnitPrice: 1,
            StripeMinTopUp: 1,
            StripePromotionCodesEnabled: false,
            CreemApiKey: '',
            CreemWebhookSecret: '',
            CreemTestMode: false,
            CreemProducts: '[]',
          }}
          waffoDefaultValues={{
            WaffoEnabled: false,
            WaffoApiKey: '',
            WaffoPrivateKey: '',
            WaffoPublicCert: '',
            WaffoSandboxPublicCert: '',
            WaffoSandboxApiKey: '',
            WaffoSandboxPrivateKey: '',
            WaffoSandbox: false,
            WaffoMerchantId: '',
            WaffoCurrency: 'USD',
            WaffoUnitPrice: 1,
            WaffoMinTopUp: 1,
            WaffoNotifyUrl: '',
            WaffoReturnUrl: '',
            WaffoPayMethods: '[]',
          }}
          waffoPancakeDefaultValues={{
            WaffoPancakeMerchantID: '',
            WaffoPancakePrivateKey: '',
            WaffoPancakeReturnURL: '',
          }}
        />
      </SettingsPageProvider>
    </>
  )
}

test('payment settings can be edited and saved without compliance confirmation', async () => {
  const user = userEvent.setup()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } })
  const post = vi.spyOn(api, 'post')
  render(
    <QueryClientProvider client={client}>
      <Fixture />
    </QueryClientProvider>
  )
  expect(
    screen.queryByText('Compliance confirmation required')
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Confirm compliance' })
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Stripe' }))
  await user.click(screen.getByRole('switch'))
  await user.click(screen.getByRole('button', { name: 'Save all settings' }))
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/', {
      key: 'StripePromotionCodesEnabled',
      value: true,
    })
  )
  expect(post).not.toHaveBeenCalled()
})
