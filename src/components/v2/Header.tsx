'use client'

import { PanelLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTranslations } from '@/lib/i18n/context'
import type { AppShellUser } from './AppShell'

interface HeaderProps {
  user: AppShellUser
  todayLabel: string
  onOpenMobileNav?: () => void
}

export default function Header({ user, todayLabel, onOpenMobileNav }: HeaderProps) {
  const { t } = useTranslations()
  const greetingName = user.name.split(' ')[0] || user.email

  return (
    <header className='flex items-center gap-4 rounded-xl border px-2.5 py-1.5 lg:py-2.5 lg:px-5'>
      {onOpenMobileNav && (
        <button
          aria-label={t('v2.header.openMenu')}
          className='md:hidden p-2 hover:bg-gray-200 hover:cursor-pointer rounded-full transition-colors'
          type='button'
          onClick={onOpenMobileNav}
        >
          <PanelLeft className='size-5' />
        </button>
      )}

      <div className='flex-1 min-w-0'>
        <h1 className='text-lg md:text-xl font-semibold truncate'>
          {t('v2.header.greeting', { name: greetingName })}
        </h1>
        <p className='text-xs md:text-sm text-muted-foreground truncate'>
          {t('v2.header.todayIs', { date: todayLabel })}
        </p>
      </div>

      <div className='flex items-center gap-3'>
        <div aria-hidden='true' className='h-8 w-px bg-border' />
        <Avatar className='size-8'>
          {user.avatarUrl && (
            <AvatarImage alt={user.name} className='object-cover' src={user.avatarUrl} />
          )}
          <AvatarFallback className='text-xs font-semibold'>{user.avatarFallback}</AvatarFallback>
        </Avatar>
        {user.roleLabel && (
          <span className='hidden md:inline text-sm font-medium'>{user.roleLabel}</span>
        )}
      </div>
    </header>
  )
}
