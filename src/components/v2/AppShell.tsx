'use client'

import { useState } from 'react'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import AppSidebar from './AppSidebar'
import Header from './Header'

export interface AppShellUser {
  name: string
  email: string
  avatarUrl: string | null
  avatarFallback: string
  roleLabel?: string
}

interface AppShellProps {
  user: AppShellUser
  children: React.ReactNode
}

// Layout: una sola superficie blanca (bg-background) con padding externo. Sin
// cards individuales para sidebar/main; ambos comparten el bg y están
// separados por un divider vertical (border-r en el aside).
//
// Padding externo se aplica en globals.css sobre [data-v2='true'] (viewport
// wrapper del layout v2). Ver ADR 20260817114952.
export default function AppShell({ user, children }: AppShellProps) {
  return (
    <SidebarProvider className='flex h-full w-full'>
      <AppShellInner user={user}>{children}</AppShellInner>
    </SidebarProvider>
  )
}

// Switch desktop/mobile por CSS (hidden md:flex) — no JS. useIsMobile() sólo
// se resuelve post-mount y causaba flash de layout desktop al recargar en
// mobile antes de la hidratación.
function AppShellInner({ user, children }: AppShellProps) {
  const { state } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)
  const collapsed = state === 'collapsed'

  return (
    <div className='flex h-full w-full min-w-0'>
      <aside
        className={cn(
          'hidden md:flex h-full rounded-xl bg-primary-contrast border transition-[width] duration-200',
          collapsed ? 'md:w-16' : 'md:w-[255px]'
        )}
      >
        <AppSidebar user={user} />
      </aside>

      {/* Main */}
      <div className='flex flex-1 flex-col min-w-0 pl-0 md:pl-6 lg:pl-12'>
        <Header user={user} onOpenMobileNav={() => setMobileOpen(true)} />
        <main className='flex-1 pt-4 lg:pt-6'>{children}</main>
      </div>

      {/* Mobile drawer — siempre montado; Radix Portal no renderiza DOM cuando
       * open=false. data-v2='true' propaga los tokens de v2 al portal (el Sheet
       * se monta en <body>, fuera del wrapper data-v2 del layout).
       * showCloseButton=false porque el hamburger del propio sidebar ya cierra
       * el drawer via onCloseMobile. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          className='w-72 bg-sidebar !p-0'
          data-v2='true'
          showCloseButton={false}
          side='left'
        >
          <SheetHeader className='sr-only'>
            <SheetTitle>Menú</SheetTitle>
          </SheetHeader>
          <AppSidebar user={user} onCloseMobile={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
