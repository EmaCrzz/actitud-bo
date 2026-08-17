'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState } from 'react'
import {
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  Home,
  LogOut,
  PanelLeft,
  ScrollText,
  Settings,
  ShoppingBag,
  SquareCheck,
  Users,
  Wallet,
} from 'lucide-react'
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { AppShellUser } from './AppShell'

const BRAND_NAME = 'Actitud Gym'
const BRAND_TAGLINE = 'Sistema de gestión'

// Etiqueta corta del ambiente para el badge junto al brand.
// production → sin badge; preview → PREVIEW; dev local → DEV.
function getEnvBadgeLabel(): string | null {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV

  if (env === 'production') return null
  if (env === 'preview') return 'PREVIEW'

  return 'DEV'
}

type MenuItem = {
  label: string
  icon: React.ElementType
  href?: string
  children?: { label: string; href?: string }[]
}

const menuItems: MenuItem[] = [
  { label: 'Inicio', icon: Home, href: '/v2/home' },
  { label: 'Clientes', icon: Users },
  { label: 'Membresías', icon: CreditCard },
  { label: 'Ventas', icon: ShoppingBag },
  { label: 'Asistencias', icon: SquareCheck },
  { label: 'Caja', icon: Wallet },
  { label: 'Reportes', icon: ScrollText },
  {
    label: 'Configuraciones',
    icon: Settings,
    children: [
      { label: 'Negocio' },
      { label: 'Membresías' },
      { label: 'Promociones' },
      { label: 'Usuarios' },
    ],
  },
]

interface AppSidebarProps {
  user: AppShellUser
  onCloseMobile?: () => void
}

export default function AppSidebar({ user, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname()
  const { toggleSidebar, isMobile, state } = useSidebar()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const envBadge = getEnvBadgeLabel()
  // El modo colapsado solo aplica en desktop; en mobile el sheet siempre se ve completo.
  const collapsed = !isMobile && state === 'collapsed'

  const handleToggle = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile()
    } else {
      toggleSidebar()
    }
  }

  return (
    <div className='flex h-full w-full flex-col text-sidebar-foreground'>
      <SidebarHeader>
        <div className={cn('flex items-center gap-2', collapsed && 'flex-col gap-2')}>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary'>
            <ArrowUpRight className='size-4 text-primary-contrast' />
          </div>
          {!collapsed && (
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-1.5'>
                <span className='text-sm font-semibold truncate'>{BRAND_NAME}</span>
                {envBadge && (
                  <span
                    className='shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-[var(--color-feedback-warning)]/15 text-[var(--color-feedback-warning)]'
                    title={`Ambiente: ${envBadge.toLowerCase()}`}
                  >
                    {envBadge}
                  </span>
                )}
              </div>
              <div className='text-xs text-muted-foreground truncate'>{BRAND_TAGLINE}</div>
            </div>
          )}
          <button
            aria-label={
              isMobile ? 'Cerrar menú' : collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'
            }
            className='p-2 hover:bg-gray-200 hover:cursor-pointer rounded-full transition-colors'
            type='button'
            onClick={handleToggle}
          >
            <PanelLeft className='size-4' />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className={cn(!collapsed ? 'p-4' : 'p-2.5')}>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = item.href ? (pathname?.endsWith(item.href) ?? false) : false
                const Icon = item.icon

                if (item.children) {
                  if (collapsed) {
                    return (
                      <SidebarMenuItem key={item.label}>
                        <CollapsedGroupPopover
                          icon={Icon}
                          items={item.children}
                          label={item.label}
                        />
                      </SidebarMenuItem>
                    )
                  }

                  const isOpen = openGroups[item.label] ?? false

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        onClick={() =>
                          setOpenGroups((prev) => ({ ...prev, [item.label]: !isOpen }))
                        }
                      >
                        <Icon />
                        <span>{item.label}</span>
                        <ChevronDown
                          className={`ml-auto size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </SidebarMenuButton>
                      {isOpen && (
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.label}>
                              <SidebarMenuSubButton>{child.label}</SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  )
                }

                const button = (
                  <SidebarMenuButton
                    className={cn(collapsed && 'justify-center')}
                    isActive={isActive}
                    tooltip={item.label}
                  >
                    <Icon />
                    {!collapsed && <span>{item.label}</span>}
                  </SidebarMenuButton>
                )

                return (
                  <SidebarMenuItem key={item.label}>
                    {item.href ? <Link href={item.href}>{button}</Link> : button}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className='border-t border-sidebar-border'>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-3',
            collapsed && 'flex-col gap-2 px-0'
          )}
        >
          <Avatar className='size-8 shrink-0'>
            {user.avatarUrl && (
              <AvatarImage alt={user.name} className='object-cover' src={user.avatarUrl} />
            )}
            <AvatarFallback className='text-xs font-semibold'>{user.avatarFallback}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className='flex-1 min-w-0'>
              <div className='text-sm font-medium truncate'>
                {user.name.split(' ')[0] || user.email}
              </div>
              <div className='text-xs text-muted-foreground truncate'>{user.email}</div>
            </div>
          )}
          <button
            aria-label='Cerrar sesión'
            className='p-2 hover:bg-gray-200 hover:cursor-pointer rounded-full transition-colors'
            type='button'
          >
            <LogOut className='size-4' />
          </button>
        </div>
      </SidebarFooter>
    </div>
  )
}

// Popover que reemplaza el acordeón en modo colapsado: al hover (desktop) o
// click (touch/tablet) sobre un item con hijos, despliega las opciones a la
// derecha. Close delay de 120ms permite mover el cursor del trigger al popover
// sin que se cierre.
function CollapsedGroupPopover({
  label,
  icon: Icon,
  items,
}: {
  label: string
  icon: React.ElementType
  items: { label: string; href?: string }[]
}) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuButton
          className='justify-center'
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={() => {
            cancelClose()
            setOpen(true)
          }}
          onMouseLeave={scheduleClose}
        >
          <Icon />
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-56 !p-2 bg-primary-contrast rounded-xl'
        data-v2='true'
        side='right'
        sideOffset={8}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <div className='mb-1 px-2 pt-1 text-xs font-semibold'>{label}</div>
        <div className='flex flex-col gap-0.5'>
          {items.map((child) => (
            <button
              key={child.label}
              className='rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-ring hover:text-sidebar-accent-foreground hover:cursor-pointer'
              type='button'
            >
              {child.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
