'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import SearchIcon from '@/components/icons/search'
import { Customer } from '@/customer/types'
import { useCustomerSearch } from '@/customer/hooks/use-customer-search'
import { useTranslations } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

interface CustomerSearchInputProps {
  renderItem: (customer: Customer, actions: { clear: () => void }) => ReactNode
  excludeIds?: Iterable<string>
  debounceMs?: number
  disabled?: boolean
  placeholder?: string
  id?: string
  loadingMessage?: string
  varinat?: 'default' | 'line'
  className?: string
  emptyMessage?: (query: string) => string
}

export function CustomerSearchInput({
  renderItem,
  excludeIds,
  debounceMs,
  disabled,
  placeholder,
  id,
  loadingMessage,
  varinat,
  className,
  emptyMessage,
}: CustomerSearchInputProps) {
  const { t } = useTranslations()
  const [isOpen, setIsOpen] = useState(false)

  const { query, setQuery, debouncedQuery, results, loading } = useCustomerSearch({
    excludeIds,
    debounceMs,
  })

  const clear = useCallback(() => {
    setQuery('')
    setIsOpen(false)
  }, [setQuery])

  const trimmedDebouncedQuery = debouncedQuery.trim()
  const showPopover = isOpen && trimmedDebouncedQuery.length > 0
  const resolvedPlaceholder = placeholder ?? t('customer.searchPlaceholder')
  const resolvedLoadingMessage = loadingMessage ?? t('common.searching')
  const resolvedEmptyMessage =
    emptyMessage ?? ((q: string) => t('customer.noCustomersFound', { query: q }))

  return (
    <Popover open={showPopover} onOpenChange={setIsOpen}>
      <PopoverAnchor className='block'>
        <Input
          autoComplete='off'
          className={cn('py-0 pl-0 mb-0', className)}
          componentLeft={<SearchIcon className='size-6 text-primary200' />}
          componentRight={
            query && (
              <Button
                aria-label={t('common.clear')}
                className='h-6 w-6 p-0 hover:bg-transparent hover:text-primary text-primary200'
                disabled={disabled}
                size='icon'
                type='button'
                variant='ghost'
                onClick={clear}
              >
                <X className='h-4 w-4' />
              </Button>
            )
          }
          disabled={disabled}
          id={id}
          placeholder={resolvedPlaceholder}
          value={query}
          variant={varinat}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(e.target.value.length > 0)
          }}
          onFocus={() => {
            if (query.length > 0) setIsOpen(true)
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        align='start'
        className='w-(--radix-popover-trigger-width) max-h-[30vh] overflow-auto p-0 bg-input-background border border-input-border'
        sideOffset={4}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul>
          {loading && (
            <li className='px-3 py-3 text-xs text-muted-foreground'>{resolvedLoadingMessage}</li>
          )}
          {!loading && results.length === 0 && (
            <li className='px-3 py-3 text-xs text-muted-foreground'>
              {resolvedEmptyMessage(trimmedDebouncedQuery)}
            </li>
          )}
          {!loading && results.map((c) => renderItem(c, { clear }))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
