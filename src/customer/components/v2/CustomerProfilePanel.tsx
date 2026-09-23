'use client'

import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTableAvatar } from '@/components/v2/DataTable'
import SidePanel from '@/components/v2/SidePanel'
import Button from '@/components/v2/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/v2/ui/Tabs'
import { fetchCustomerProfile } from '@/customer/api/client'
import type { CustomerWithMembership } from '@/customer/types'
import { getInitials } from '@/lib/format-person'
import { useTranslations } from '@/lib/i18n/context'
import CustomerProfileAssistances from './CustomerProfileAssistances'
import CustomerProfileInfo from './CustomerProfileInfo'
import CustomerProfileMembership from './CustomerProfileMembership'
import CustomerProfilePayments from './CustomerProfilePayments'

interface CustomerProfilePanelProps {
  /**
   * Fila que abrió el panel. Llega entera y no sólo el id para poder pintar la
   * identidad (avatar y nombre) en el primer frame: el listado ya tiene esos
   * datos, así que esperar al fetch para mostrarlos sería un parpadeo gratis.
   * `null` cuando el panel nunca se abrió.
   */
  customer: CustomerWithMembership | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Ver `CustomerProfilePayments`: finanzas es admin-only a nivel RLS. */
  canReadPayments: boolean
  /**
   * Abre el flow de renovación (Fase 8). Lo maneja quien monta el panel porque
   * el Figma **reemplaza** este panel por el de renovación en vez de apilarlos.
   */
  onRenew: () => void
}

/**
 * Panel "Perfil del cliente" (`Customer Detail Modal` del Figma, Fase 6b).
 *
 * Cuatro tabs — Membresía · Pagos · Asistencias · Info — sobre el `SidePanel` de
 * la Fase 5, que ya resuelve la geometría (480px a la derecha en desktop,
 * full-screen en mobile).
 *
 * La lista de tabs es `sticky` en vez de ir en el slot `pinned` del SidePanel:
 * `pinned` dibuja su propio `border-b` y el Figma no tiene una línea entre el
 * nombre y los tabs, además de que Radix necesita `TabsList` y `TabsContent`
 * bajo la misma raíz `<Tabs>`.
 */
export default function CustomerProfilePanel({
  customer,
  open,
  onOpenChange,
  canReadPayments,
  onRenew,
}: CustomerProfilePanelProps) {
  const { t } = useTranslations()

  const {
    data: profile,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['customer', 'v2', 'profile', customer?.id],
    queryFn: () => fetchCustomerProfile(customer!.id),
    enabled: Boolean(open && customer?.id),
  })

  const name = customer ? `${customer.first_name} ${customer.last_name}`.trim() : ''

  return (
    <SidePanel
      footer={
        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outlined' onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          {/* Renovar es el flow de la Fase 8 (`2167:22902`). El Figma lo ancla
              al footer del panel en las cuatro vistas. */}
          <Button type='button' onClick={onRenew}>
            <RefreshCw aria-hidden className='size-4' />
            {t('v2.customers.profile.renew')}
          </Button>
        </div>
      }
      open={open}
      title={t('v2.customers.profile.title')}
      onOpenChange={onOpenChange}
    >
      {customer && (
        <div className='flex items-center gap-3 pb-4'>
          <DataTableAvatar initials={getInitials(name)} />
          <span className='truncate text-base font-semibold'>{name}</span>
        </div>
      )}

      <Tabs defaultValue='membership'>
        <TabsList className='sticky top-0 z-10 bg-background'>
          <TabsTrigger value='membership'>{t('v2.customers.profile.tabs.membership')}</TabsTrigger>
          <TabsTrigger value='payments'>{t('v2.customers.profile.tabs.payments')}</TabsTrigger>
          <TabsTrigger value='assistances'>
            {t('v2.customers.profile.tabs.assistances')}
          </TabsTrigger>
          <TabsTrigger value='info'>{t('v2.customers.profile.tabs.info')}</TabsTrigger>
        </TabsList>

        <div className='pt-4'>
          <TabsContent value='membership'>
            {isError ? (
              <LoadError />
            ) : isPending || !profile ? (
              <ProfileSkeleton />
            ) : (
              <CustomerProfileMembership profile={profile} />
            )}
          </TabsContent>

          {/* Los pagos no dependen del perfil: tienen su propia consulta y su
              propio estado de permisos, así que el tab se monta igual. */}
          <TabsContent value='payments'>
            {customer && (
              <CustomerProfilePayments
                canReadPayments={canReadPayments}
                customerId={customer.id}
              />
            )}
          </TabsContent>

          <TabsContent value='assistances'>
            {customer && <CustomerProfileAssistances customerId={customer.id} />}
          </TabsContent>

          <TabsContent value='info'>
            {isError ? (
              <LoadError />
            ) : isPending || !profile ? (
              <ProfileSkeleton />
            ) : (
              <CustomerProfileInfo profile={profile} />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </SidePanel>
  )
}

// Sub-componentes

function LoadError() {
  const { t } = useTranslations()

  return <p className='py-2 text-sm text-muted-foreground'>{t('v2.customers.profile.loadError')}</p>
}

function ProfileSkeleton() {
  return (
    <div aria-busy className='flex flex-col gap-3'>
      <Skeleton className='h-28 w-full rounded-lg' />
      <Skeleton className='h-4 w-2/3' />
      <Skeleton className='h-4 w-1/2' />
    </div>
  )
}
