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
import { useQuery } from '@tanstack/react-query'
import i18next from 'i18next'
import { useEffect } from 'react'

import { isHttpUrl } from '@/lib/content-format'
import { handleServerError } from '@/lib/handle-server-error'
import {
  createServerError,
  requireServerSuccess,
} from '@/lib/server-error-message'

import { getHomePageContent } from '../api'
import type { HomePageContentResult } from '../types'

const STORAGE_KEY = 'newapi:home-page:v1'

/** Empty content is a confirmed default homepage; undefined means unknown. */
function readCachedHomePageContent(): string | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const cached: unknown = JSON.parse(raw)
      if (
        cached &&
        typeof cached === 'object' &&
        'content' in cached &&
        typeof cached.content === 'string'
      ) {
        return cached.content
      }
      return undefined
    }
    // Older releases stored only non-empty custom content in this key.
    return window.localStorage.getItem('home_page_content') || undefined
  } catch {
    return undefined
  }
}

export function useHomePageContent(): HomePageContentResult {
  const query = useQuery({
    queryKey: ['homePageContent'],
    queryFn: async ({ signal }) => {
      const response = requireServerSuccess(await getHomePageContent(signal))
      const content = response.data
      if (typeof content !== 'string') {
        throw createServerError(response, 'Failed to load home page content')
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ content }))
        window.localStorage.removeItem('home_page_content')
      } catch {
        // Storage failures must not discard a valid network response.
      }
      return content
    },
    initialData: readCachedHomePageContent,
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
    retry: false,
    meta: { errorToast: false, errorRedirect: false },
  })

  useEffect(() => {
    if (query.error && query.data !== undefined) {
      handleServerError(
        query.error,
        i18next.t('Failed to load home page content')
      )
    }
  }, [query.error, query.data])

  const content = query.data ?? ''
  const isUrl = isHttpUrl(content)
  let status: HomePageContentResult['status'] = 'unknown'
  if (query.data !== undefined) {
    status = content ? 'custom' : 'default'
  } else if (query.isError) {
    status = 'error'
  }

  return {
    content,
    status,
    isUrl,
    isRefreshing: query.isFetching,
    error: query.error,
    retry: async () => {
      await query.refetch()
    },
  }
}
