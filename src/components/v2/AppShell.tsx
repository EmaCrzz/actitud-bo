'use client'

import { useState } from 'react'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/lib/i18n/context'
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
  todayLabel: string
  children: React.ReactNode
}

// Layout: una sola superficie blanca (bg-background) con padding externo. Sin
// cards individuales para sidebar/main; ambos comparten el bg y están
// separados por un divider vertical (border-r en el aside).
//
// Padding externo se aplica en globals.css sobre [data-v2='true'] (viewport
// wrapper del layout v2). Ver ADR 20260817114952.
export default function AppShell({ user, todayLabel, children }: AppShellProps) {
  return (
    <SidebarProvider className='flex h-full w-full'>
      <AppShellInner todayLabel={todayLabel} user={user}>
        {children}
      </AppShellInner>
    </SidebarProvider>
  )
}

// Switch desktop/mobile por CSS (hidden md:flex) — no JS. useIsMobile() sólo
// se resuelve post-mount y causaba flash de layout desktop al recargar en
// mobile antes de la hidratación.
function AppShellInner({ user, todayLabel, children }: AppShellProps) {
  const { t } = useTranslations()
  const { state } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)
  const collapsed = state === 'collapsed'

  return (
    <div className='flex h-full w-full min-w-0'>
      <aside
        className={cn(
          'hidden md:flex h-full rounded-lg bg-primary-contrast border transition-[width] duration-200',
          collapsed ? 'md:w-16' : 'md:w-[255px]'
        )}
      >
        <AppSidebar user={user} />
      </aside>

      {/* Main
       *
       * `min-h-0` en los dos niveles no es opcional: un flex item tiene
       * `min-height: auto`, así que no puede encogerse por debajo de su
       * contenido. Sin esto, una página larga (un listado de clientes, sin ir
       * más lejos) empuja el main más allá del `h-dvh` del wrapper `[data-v2]`
       * y el sobrante se dibuja sobre el fondo del tenant v1.
       *
       * Es el gemelo vertical del `flex-1 w-full min-w-0` que documentó el ADR
       * de la fase 1.5 para el ancho. */}
      <div className='flex flex-1 flex-col min-h-0 min-w-0 pl-0 md:pl-6 lg:pl-12'>
        <Header todayLabel={todayLabel} user={user} onOpenMobileNav={() => setMobileOpen(true)} />
        {/* `main` es EL contenedor de scroll de la v2.
         *
         * `min-h-0` solo le permite encogerse; no evita que el contenido se
         * dibuje fuera. Sin `overflow-y-auto` cualquier página más alta que el
         * `h-dvh` del wrapper `[data-v2]` pinta el sobrante sobre el fondo
         * negro del tenant v1 (visible sobre todo en mobile, donde el viewport
         * es corto). Con el scroll acá, ninguna página nueva puede reintroducir
         * el bug: las páginas sólo tienen que usar `min-h-full` en su contenedor
         * raíz para que el borde del card crezca con el contenido.
         *
         * `overscroll-contain` evita que el scroll encadene al body cuando se
         * llega a los extremos (pull-to-refresh accidental en mobile). */}
        <main className='flex-1 min-h-0 overflow-y-auto overscroll-contain pt-4 lg:pt-6'>
          {children}
        </main>
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
            <SheetTitle>{t('v2.sidebar.menuTitle')}</SheetTitle>
          </SheetHeader>
          <AppSidebar user={user} onCloseMobile={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
