'use client'

import { CreditCard, UserPlus } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/context'
import Button from '@/components/v2/ui/Button'
import { useComingSoonToast } from '@/components/v2/use-coming-soon-toast'

export default function QuickActionsSection() {
  const { t } = useTranslations()
  const notifyComingSoon = useComingSoonToast()

  return (
    <section aria-labelledby='v2-quick-actions-title' className='flex flex-col gap-3'>
      <h2 className='text-sm font-medium text-muted-foreground' id='v2-quick-actions-title'>
        {t('v2.home.quickActions.title')}
      </h2>
      <div className='flex flex-col sm:flex-row gap-3'>
        <Button className='justify-start sm:w-auto' type='button' variant='outlined' onClick={notifyComingSoon}>
          <UserPlus className='size-4' />
          {t('v2.home.quickActions.newCustomer')}
        </Button>
        <Button className='justify-start sm:w-auto' type='button' variant='outlined' onClick={notifyComingSoon}>
          <CreditCard className='size-4' />
          {t('v2.home.quickActions.registerPayment')}
        </Button>
      </div>
    </section>
  )
}
