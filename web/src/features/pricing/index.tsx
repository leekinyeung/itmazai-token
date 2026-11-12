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
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout/components/public-layout'

import { EmptyState } from './components/empty-state'
import { LoadingSkeleton } from './components/loading-skeleton'
import { ModelCardGrid } from './components/model-card-grid'
import { PricingPageFrame } from './components/pricing-page-frame'
import { PricingSidebar } from './components/pricing-sidebar'
import { PricingTable } from './components/pricing-table'
import { PricingToolbar } from './components/pricing-toolbar'
import { VIEW_MODES } from './constants'
import { useFilters } from './hooks/use-filters'
import { usePricingData } from './hooks/use-pricing-data'

export function Pricing() {
  const { t } = useTranslation()
  const { models, vendors, isLoading, priceRate, usdExchangeRate } =
    usePricingData()

  const {
    searchInput,
    sortBy,
    vendorFilter,
    endpointTypeFilter,
    tagFilter,
    tokenUnit,
    viewMode,
    showRechargePrice,
    setSearchInput,
    setSortBy,
    setVendorFilter,
    setEndpointTypeFilter,
    setTagFilter,
    setTokenUnit,
    setViewMode,
    setShowRechargePrice,
    filteredModels,
    hasActiveFilters,
    activeFilterCount,
    availableTags,
    clearFilters,
    clearSearch,
  } = useFilters(models || [])

  const handleClearAll = useCallback(() => {
    clearFilters()
    clearSearch()
  }, [clearFilters, clearSearch])

  const renderPricingContent = () => {
    if (filteredModels.length === 0) {
      return (
        <EmptyState
          searchQuery={searchInput}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearAll}
        />
      )
    }

    if (viewMode === VIEW_MODES.CARD) {
      return (
        <ModelCardGrid
          models={filteredModels}
          priceRate={priceRate}
          usdExchangeRate={usdExchangeRate}
          tokenUnit={tokenUnit}
          showRechargePrice={showRechargePrice}
        />
      )
    }

    return (
      <PricingTable
        models={filteredModels}
        priceRate={priceRate}
        usdExchangeRate={usdExchangeRate}
        tokenUnit={tokenUnit}
        showRechargePrice={showRechargePrice}
      />
    )
  }

  return (
    <PublicLayout showMainContainer={false}>
      <PricingPageFrame>
        {isLoading ? (
          <LoadingSkeleton viewMode={viewMode} />
        ) : (
          <>
            <h1 className='sr-only'>{t('AI Models & API Pricing')}</h1>
            <div className='grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]'>
              <PricingSidebar
                endpointTypeFilter={endpointTypeFilter}
                vendorFilter={vendorFilter}
                tagFilter={tagFilter}
                onEndpointTypeChange={setEndpointTypeFilter}
                onVendorChange={setVendorFilter}
                onTagChange={setTagFilter}
                vendors={vendors || []}
                tags={availableTags}
                models={models || []}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                className='hover-scrollbar sticky top-20 hidden max-h-[calc(100dvh-6rem)] self-start overflow-y-auto xl:block'
              />

              <main className='min-w-0 space-y-4'>
                <div className='xl:sticky xl:top-20 xl:z-30'>
                  <PricingToolbar
                    searchValue={searchInput}
                    onSearchChange={setSearchInput}
                    onClearSearch={clearSearch}
                    searchPlaceholder={t(
                      'Search model name, provider, endpoint, or tag...'
                    )}
                    filteredCount={filteredModels.length}
                    totalCount={models?.length}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    tokenUnit={tokenUnit}
                    onTokenUnitChange={setTokenUnit}
                    showRechargePrice={showRechargePrice}
                    onRechargePriceChange={setShowRechargePrice}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    endpointTypeFilter={endpointTypeFilter}
                    vendorFilter={vendorFilter}
                    tagFilter={tagFilter}
                    onEndpointTypeChange={setEndpointTypeFilter}
                    onVendorChange={setVendorFilter}
                    onTagChange={setTagFilter}
                    vendors={vendors || []}
                    tags={availableTags}
                    models={models || []}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onClearFilters={clearFilters}
                  />
                </div>

                {renderPricingContent()}
              </main>
            </div>
          </>
        )}
      </PricingPageFrame>
    </PublicLayout>
  )
}
