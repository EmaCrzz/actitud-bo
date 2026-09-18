'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, UserPlus } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/context'
import Button from '@/components/v2/ui/Button'
import { useComingSoonToast } from '@/components/v2/use-coming-soon-toast'
import CustomerFormPanel from '@/customer/components/v2/CustomerFormPanel'

export default function QuickActionsSection() {
  const { t } = useTranslations()
  const router = useRouter()
  const notifyComingSoon = useComingSoonToast()
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false)

  return (
    <section aria-labelledby='v2-quick-actions-title' className='flex flex-col gap-3'>
      <h2 className='text-sm font-medium text-muted-foreground' id='v2-quick-actions-title'>
        {t('v2.home.quickActions.title')}
      </h2>
      <div className='flex flex-col sm:flex-row gap-3'>
        <Button
          className='justify-start sm:w-auto'
          type='button'
          variant='outlined'
          onClick={() => setIsNewCustomerOpen(true)}
        >
          <UserPlus className='size-4' />
          {t('v2.home.quickActions.newCustomer')}
        </Button>
        {/* "Renovar membresía" sigue pendiente: es la Fase 8. */}
        <Button className='justify-start sm:w-auto' type='button' variant='outlined' onClick={notifyComingSoon}>
          <CreditCard className='size-4' />
          {t('v2.home.quickActions.registerPayment')}
        </Button>
      </div>

      <CustomerFormPanel
        open={isNewCustomerOpen}
        onCreated={() => {
          // El alta mueve tres cosas del home: "Clientes activos del mes", el
          // "Resumen del día" y —si se cobró— los ingresos. Todas se resuelven
          // en server components, así que se refresca la ruta en vez de
          // invalidar queries de react-query que acá no existen.
          router.refresh()
        }}
        onOpenChange={setIsNewCustomerOpen}
      />
    </section>
  )
}
