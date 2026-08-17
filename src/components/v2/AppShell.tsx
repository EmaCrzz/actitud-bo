'use client'

import { useState } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
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
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <SidebarProvider className='flex h-full w-full'>
      <div className='flex h-full'>
        {/* Sidebar inline en desktop. En mobile se renderiza como Sheet abajo. */}
        {!isMobile && (
          <aside className='flex h-full rounded-lg bg-primary-contrast border'>
            <AppSidebar user={user} />
          </aside>
        )}

        {/* Main */}
        <div className='flex flex-1 flex-col min-w-0 pl-0 md:pl-6 lg:pl-12'>
          <Header user={user} onOpenMobileNav={() => setMobileOpen(true)} />
          <main className='flex-1 pt-4 lg:pt-6'>{children}</main>
        </div>

        {/* Mobile drawer */}
        {isMobile && (
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent className='w-72 p-0' side='left'>
              <SheetHeader className='sr-only'>
                <SheetTitle>Menú</SheetTitle>
              </SheetHeader>
              <AppSidebar user={user} onCloseMobile={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </SidebarProvider>
  )
}
