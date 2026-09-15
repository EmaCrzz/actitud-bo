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
  Receipt,
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
import { useTranslations } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n/types'
import { ROUTES_V2 } from '@/consts/routes'
import type { AppShellUser } from './AppShell'

// Etiqueta del ambiente calculada una sola vez en build. `production` → null
// (sin badge). Reemplaza la función que corría en cada render.
const ENV_BADGE: 'DEV' | 'PREVIEW' | null = (() => {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV

  if (env === 'production') return null
  if (env === 'preview') return 'PREVIEW'

  return 'DEV'
})()

type MenuChild = {
  labelKey: TranslationKey
  href: string
}

type MenuItem = {
  labelKey: TranslationKey
  icon: React.ElementType
  href?: string
  children?: MenuChild[]
}

// Orden y etiquetas tomados del sidebar del Figma (nodo 2060:11534).
const menuItems: MenuItem[] = [
  { labelKey: 'v2.sidebar.menu.home', icon: Home, href: ROUTES_V2.V2_HOME },
  { labelKey: 'v2.sidebar.menu.customers', icon: Users, href: ROUTES_V2.V2_CUSTOMERS },
  { labelKey: 'v2.sidebar.menu.attendance', icon: SquareCheck, href: ROUTES_V2.V2_ATTENDANCE },
  { labelKey: 'v2.sidebar.menu.memberships', icon: CreditCard, href: ROUTES_V2.V2_MEMBERSHIPS },
  { labelKey: 'v2.sidebar.menu.sales', icon: ShoppingBag, href: ROUTES_V2.V2_SALES },
  { labelKey: 'v2.sidebar.menu.expenses', icon: Receipt, href: ROUTES_V2.V2_EXPENSES },
  { labelKey: 'v2.sidebar.menu.balance', icon: Wallet, href: ROUTES_V2.V2_BALANCE },
  {
    labelKey: 'v2.sidebar.menu.settings',
    icon: Settings,
    children: [
      {
        labelKey: 'v2.sidebar.menu.settingsSubmenu.business',
        href: ROUTES_V2.V2_SETTINGS_BUSINESS,
      },
      {
        labelKey: 'v2.sidebar.menu.settingsSubmenu.memberships',
        href: ROUTES_V2.V2_SETTINGS_MEMBERSHIPS,
      },
      {
        labelKey: 'v2.sidebar.menu.settingsSubmenu.promotions',
        href: ROUTES_V2.V2_SETTINGS_PROMOTIONS,
      },
      { labelKey: 'v2.sidebar.menu.settingsSubmenu.users', href: ROUTES_V2.V2_SETTINGS_USERS },
    ],
  },
]

// Un item está activo si el pathname es su ruta, o una sub-ruta de ella
// (`/v2/customers/123` mantiene "Clientes" marcado).
//
// Se compara por sufijo porque `usePathname()` puede devolver el path ya
// prefijado con `/{lang}/{tenant}` según cómo resuelva el rewrite. Comparar
// incluyendo las barras evita que `/v2/settings/memberships` marque también
// a `/v2/memberships`.
function isRouteActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false

  return pathname === href || pathname.endsWith(href) || pathname.includes(`${href}/`)
}

interface AppSidebarProps {
  user: AppShellUser
  onCloseMobile?: () => void
}

export default function AppSidebar({ user, onCloseMobile }: AppSidebarProps) {
  const { isMobile, state, toggleSidebar } = useSidebar()
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
      <SidebarBrand collapsed={collapsed} isMobile={isMobile} onToggle={handleToggle} />

      <SidebarContent>
        <SidebarGroup className={cn(!collapsed ? 'p-4' : 'p-2.5')}>
          <SidebarGroupContent>
            <MenuList collapsed={collapsed} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarUserFooter collapsed={collapsed} user={user} />
    </div>
  )
}

interface SidebarBrandProps {
  collapsed: boolean
  isMobile: boolean
  onToggle: () => void
}

function SidebarBrand({ collapsed, isMobile, onToggle }: SidebarBrandProps) {
  const { t } = useTranslations()
  const toggleLabel = isMobile
    ? t('v2.sidebar.closeMenu')
    : collapsed
      ? t('v2.sidebar.expandSidebar')
      : t('v2.sidebar.collapseSidebar')

  return (
    <SidebarHeader>
      <div className={cn('flex items-center gap-2', collapsed && 'flex-col gap-2')}>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary'>
          <ArrowUpRight className='size-4 text-primary-contrast' />
        </div>
        {!collapsed && (
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-1.5'>
              <span className='text-sm font-semibold truncate'>{t('v2.sidebar.brandName')}</span>
              {ENV_BADGE && <EnvBadge label={ENV_BADGE} />}
            </div>
            <div className='text-xs text-muted-foreground truncate'>
              {t('v2.sidebar.brandTagline')}
            </div>
          </div>
        )}
        <button
          aria-label={toggleLabel}
          className='p-2 hover:bg-gray-200 hover:cursor-pointer rounded-full transition-colors'
          type='button'
          onClick={onToggle}
        >
          <PanelLeft className='size-4' />
        </button>
      </div>
    </SidebarHeader>
  )
}

function EnvBadge({ label }: { label: 'DEV' | 'PREVIEW' }) {
  const { t } = useTranslations()
  const badgeKey: TranslationKey =
    label === 'PREVIEW' ? 'v2.sidebar.envBadge.preview' : 'v2.sidebar.envBadge.dev'
  const displayLabel = t(badgeKey)

  return (
    <span
      className='shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-[var(--color-feedback-warning)]/15 text-[var(--color-feedback-warning)]'
      title={t('v2.sidebar.envTooltip', { env: displayLabel })}
    >
      {displayLabel}
    </span>
  )
}

function MenuList({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()

  return (
    <SidebarMenu>
      {menuItems.map((item) => {
        if (item.children) {
          const activeChildHref = item.children.find((child) =>
            isRouteActive(pathname, child.href)
          )?.href

          return collapsed ? (
            <MenuGroupItemCollapsed
              key={item.labelKey}
              activeChildHref={activeChildHref}
              icon={item.icon}
              items={item.children}
              labelKey={item.labelKey}
            />
          ) : (
            <MenuGroupItemExpanded
              key={item.labelKey}
              activeChildHref={activeChildHref}
              icon={item.icon}
              items={item.children}
              labelKey={item.labelKey}
            />
          )
        }

        return (
          <MenuLeafItem
            key={item.labelKey}
            collapsed={collapsed}
            href={item.href}
            icon={item.icon}
            isActive={item.href ? isRouteActive(pathname, item.href) : false}
            labelKey={item.labelKey}
          />
        )
      })}
    </SidebarMenu>
  )
}

interface MenuLeafItemProps {
  labelKey: TranslationKey
  icon: React.ElementType
  href?: string
  isActive: boolean
  collapsed: boolean
}

function MenuLeafItem({ labelKey, icon: Icon, href, isActive, collapsed }: MenuLeafItemProps) {
  const { t } = useTranslations()
  const label = t(labelKey)

  const button = (
    <SidebarMenuButton
      className={cn(collapsed && 'justify-center')}
      isActive={isActive}
      tooltip={label}
    >
      <Icon />
      {!collapsed && <span>{label}</span>}
    </SidebarMenuButton>
  )

  return <SidebarMenuItem>{href ? <Link href={href}>{button}</Link> : button}</SidebarMenuItem>
}

interface MenuGroupItemProps {
  labelKey: TranslationKey
  icon: React.ElementType
  items: MenuChild[]
  // href del hijo activo, si el pathname actual cae dentro del grupo.
  activeChildHref?: string
}

// Modo expandido: acordeón inline con los sub-items.
function MenuGroupItemExpanded({
  labelKey,
  icon: Icon,
  items,
  activeChildHref,
}: MenuGroupItemProps) {
  const { t } = useTranslations()
  // Si estamos parados en una sub-ruta del grupo, el acordeón arranca abierto:
  // sería raro entrar a Configuraciones → Negocio y ver el menú cerrado.
  const [isOpen, setIsOpen] = useState(Boolean(activeChildHref))

  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={Boolean(activeChildHref)} onClick={() => setIsOpen((p) => !p)}>
        <Icon />
        <span>{t(labelKey)}</span>
        <ChevronDown
          className={`ml-auto size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </SidebarMenuButton>
      {isOpen && (
        <SidebarMenuSub>
          {items.map((child) => (
            <SidebarMenuSubItem key={child.labelKey}>
              <SidebarMenuSubButton asChild isActive={child.href === activeChildHref}>
                <Link href={child.href}>{t(child.labelKey)}</Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

// Modo colapsado: popover a la derecha en vez de acordeón. Al hover (desktop) o
// click (touch/tablet) sobre un item con hijos, despliega las opciones.
// Close delay de 120ms para mover el cursor del trigger al popover sin cerrar.
function MenuGroupItemCollapsed({
  labelKey,
  icon: Icon,
  items,
  activeChildHref,
}: MenuGroupItemProps) {
  const { t } = useTranslations()
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
    <SidebarMenuItem>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <SidebarMenuButton
            className='justify-center'
            isActive={Boolean(activeChildHref)}
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
          <div className='mb-1 px-2 pt-1 text-xs font-semibold'>{t(labelKey)}</div>
          <div className='flex flex-col gap-0.5'>
            {items.map((child) => (
              <Link
                key={child.labelKey}
                className={cn(
                  'rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-ring hover:text-sidebar-accent-foreground',
                  child.href === activeChildHref &&
                    'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
                href={child.href}
                onClick={() => setOpen(false)}
              >
                {t(child.labelKey)}
              </Link>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  )
}

interface SidebarUserFooterProps {
  user: AppShellUser
  collapsed: boolean
}

function SidebarUserFooter({ user, collapsed }: SidebarUserFooterProps) {
  const { t } = useTranslations()

  return (
    <SidebarFooter className='border-t border-sidebar-border'>
      <div
        className={cn('flex items-center gap-2 px-2 py-3', collapsed && 'flex-col gap-2 px-0')}
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
          aria-label={t('v2.sidebar.logout')}
          className='p-2 hover:bg-gray-200 hover:cursor-pointer rounded-full transition-colors'
          type='button'
        >
          <LogOut className='size-4' />
        </button>
      </div>
    </SidebarFooter>
  )
}
