'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PanelLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { AppShellUser } from './AppShell'

interface HeaderProps {
  user: AppShellUser
  onOpenMobileNav?: () => void
}

export default function Header({ user, onOpenMobileNav }: HeaderProps) {
  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: es })
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1)
  const greetingName = user.name.split(' ')[0] || user.email

  return (
    <header className='flex items-center gap-4 rounded-lg border px-2.5 py-1.5 lg:py-2.5 lg:px-5'>
      {onOpenMobileNav && (
        <button
          aria-label='Abrir menú'
          className='md:hidden p-1 rounded hover:bg-muted'
          type='button'
          onClick={onOpenMobileNav}
        >
          <PanelLeft className='size-5' />
        </button>
      )}

      <div className='flex-1 min-w-0'>
        <h1 className='text-lg md:text-xl font-semibold truncate'>¡Hola, {greetingName}!</h1>
        <p className='text-xs md:text-sm text-muted-foreground truncate'>
          Hoy es {todayCapitalized}
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
