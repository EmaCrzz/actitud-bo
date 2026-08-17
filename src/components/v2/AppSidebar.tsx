'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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
  // En desktop siempre está expandido. En mobile (sheet) también.
  // El toggle de colapsar a solo iconos queda para una iteración futura.
  onCloseMobile?: () => void
}

export default function AppSidebar({ user, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname()
  const { toggleSidebar, isMobile } = useSidebar()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const envBadge = getEnvBadgeLabel()

  const handleToggle = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile()
    } else {
      toggleSidebar()
    }
  }

  return (
    <div className='flex h-full w-[255px] flex-col text-sidebar-foreground'>
      <SidebarHeader>
        <div className='flex items-center gap-2'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary'>
            <ArrowUpRight className='size-4 text-primary-contrast' />
          </div>
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
          <button
            aria-label={isMobile ? 'Cerrar menú' : 'Colapsar sidebar'}
            className='p-1 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            type='button'
            onClick={handleToggle}
          >
            <PanelLeft className='size-4' />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = item.href ? (pathname?.endsWith(item.href) ?? false) : false
                const Icon = item.icon

                if (item.children) {
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
                  <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                    <Icon />
                    <span>{item.label}</span>
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
        <div className='flex items-center gap-2 px-2 py-3'>
          <Avatar className='size-8 shrink-0'>
            {user.avatarUrl && (
              <AvatarImage alt={user.name} className='object-cover' src={user.avatarUrl} />
            )}
            <AvatarFallback className='text-xs font-semibold'>{user.avatarFallback}</AvatarFallback>
          </Avatar>
          <div className='flex-1 min-w-0'>
            <div className='text-sm font-medium truncate'>
              {user.name.split(' ')[0] || user.email}
            </div>
            <div className='text-xs text-muted-foreground truncate'>{user.email}</div>
          </div>
          <button
            aria-label='Cerrar sesión'
            className='p-1 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            type='button'
          >
            <LogOut className='size-4' />
          </button>
        </div>
      </SidebarFooter>
    </div>
  )
}
