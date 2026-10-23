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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { AffiliateRewardsCard } from '../components/affiliate-rewards-card'
import { RechargeFormCard } from '../components/recharge-form-card'

test('redemption stays available when a cached response contains a legacy disabled flag', async () => {
  const user = userEvent.setup()
  const onRedeem = vi.fn()
  const props = {
    topupInfo: {
      enable_online_topup: false,
      enable_stripe_topup: false,
      enable_redemption: false,
      pay_methods: [],
      min_topup: 1,
      stripe_min_topup: 1,
      amount_options: [],
      discount: {},
    },
    presetAmounts: [],
    selectedPreset: null,
    topupAmount: 1,
    paymentAmount: 1,
    priceRatio: 1,
    calculating: false,
    paymentLoading: null,
    redemptionCode: 'test-code',
    redeeming: false,
    onSelectPreset: vi.fn(),
    onTopupAmountChange: vi.fn(),
    onPaymentMethodSelect: vi.fn(),
    onRedemptionCodeChange: vi.fn(),
    onRedeem,
  }
  const view = render(<RechargeFormCard {...props} />)
  expect(screen.getByPlaceholderText('Enter your redemption code')).toHaveValue(
    'test-code'
  )
  await user.click(screen.getByRole('button', { name: 'Redeem' }))
  expect(onRedeem).toHaveBeenCalledOnce()
  expect(
    screen.queryByText(/disabled until the administrator/)
  ).not.toBeInTheDocument()
  view.rerender(<RechargeFormCard {...props} redeeming />)
  expect(screen.getByRole('button', { name: 'Redeem' })).toBeDisabled()
})

test('available referral rewards can be transferred without compliance confirmation', async () => {
  const user = userEvent.setup()
  const onTransfer = vi.fn()
  const legacyProps = { complianceConfirmed: false }
  render(
    <AffiliateRewardsCard
      {...legacyProps}
      user={{
        id: 1,
        username: 'referrer',
        quota: 0,
        used_quota: 0,
        request_count: 0,
        aff_quota: 100,
        aff_history_quota: 100,
        aff_count: 1,
        group: 'default',
      }}
      affiliateLink='https://example.com/register?aff=test'
      onTransfer={onTransfer}
    />
  )
  const transfer = screen.getByRole('button', { name: 'Transfer to Balance' })
  expect(transfer).toBeEnabled()
  await user.click(transfer)
  expect(onTransfer).toHaveBeenCalledOnce()
  expect(
    screen.queryByText(/disabled until the administrator/)
  ).not.toBeInTheDocument()
})
