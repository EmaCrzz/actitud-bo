'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { UsersRound, ChevronRight, InfoIcon } from 'lucide-react'

import { listGroupsWithCount } from '@/group/api/client'
import { CUSTOMER_GROUPS } from '@/consts/routes'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useTranslations } from '@/lib/i18n/context'

export default function ListGroups() {
  const { t } = useTranslations()

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups', 'list'],
    queryFn: () => listGroupsWithCount(),
  })

  if (isLoading) {
    return (
      <ul className='mt-6 grid gap-3'>
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <Skeleton className='h-16 w-full rounded-lg' />
          </li>
        ))}
      </ul>
    )
  }

  if (!groups || groups.length === 0) {
    return (
      <Alert>
        <InfoIcon />
        <AlertTitle>{t('groups.emptyListTitle')}</AlertTitle>
        <AlertDescription>{t('groups.emptyListDescription')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <ul className='mt-6 grid gap-3'>
      {groups.map((group) => (
        <li key={group.id}>
          <Link
            className='flex items-center gap-3 rounded-lg border border-input-border bg-input-background px-4 py-3 transition-colors hover:bg-input-hover-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            href={`${CUSTOMER_GROUPS}/${group.id}`}
          >
            <UsersRound className='size-6 text-primary200 shrink-0' />
            <div className='grid flex-1'>
              <span className='text-sm font-semibold text-white'>{group.name}</span>
              <span className='text-xs text-primary'>
                {t('groups.membersCount', { count: group.active_members_count })}
              </span>
            </div>
            <ChevronRight className='size-5 text-white/60' />
          </Link>
        </li>
      ))}
    </ul>
  )
}
