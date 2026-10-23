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
import type { Row } from '@tanstack/react-table'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import type { PlanRecord } from '../../types'
import { DataTableRowActions } from '../data-table-row-actions'
import { SubscriptionsPrimaryButtons } from '../subscriptions-primary-buttons'
import {
  SubscriptionsProvider,
  useSubscriptions,
} from '../subscriptions-provider'

function Fixture() {
  const { open } = useSubscriptions()
  return (
    <>
      <SubscriptionsPrimaryButtons />
      <DataTableRowActions
        row={
          { original: { plan: { id: 1, enabled: true } } } as Row<PlanRecord>
        }
      />
      <output aria-label='Selected action'>{open}</output>
    </>
  )
}

test('subscription actions work without fetching compliance settings', async () => {
  const user = userEvent.setup()
  const get = vi
    .spyOn(api, 'get')
    .mockResolvedValue({ data: { success: true, data: [] } })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <SubscriptionsProvider>
        <Fixture />
      </SubscriptionsProvider>
    </QueryClientProvider>
  )
  for (const [label, action] of [
    ['Create Plan', 'create'],
    ['Edit', 'update'],
    ['Reset subscription quota', 'reset-subscriptions'],
    ['Disable', 'toggle-status'],
  ]) {
    const button = screen.getByRole('button', { name: label })
    expect(button).toBeEnabled()
    await user.click(button)
    expect(screen.getByLabelText('Selected action')).toHaveTextContent(action)
  }
  expect(get).not.toHaveBeenCalled()
})
