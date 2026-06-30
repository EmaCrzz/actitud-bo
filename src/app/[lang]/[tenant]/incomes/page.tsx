import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { ACCOUNTING, STATS } from '@/consts/routes'
import CustomerActives from '@/customer/stats/actives'
import api from '@/lib/i18n/api'
import { Language } from '@/lib/i18n/types'
import { TenantsType } from '@/lib/tenants'
import Link from 'next/link'

export default async function IncomesPage({
  params,
}: {
  params: Promise<{ lang: Language; tenant: TenantsType }>
}) {
  const { lang, tenant } = await params
  const { t } = await api.fetch(lang, tenant)

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={`${STATS}${ACCOUNTING}`}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('accounting.income.title')}</h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 pt-6 flex flex-col gap-y-5'>
        <h3 className='font-extralight text-xs'>{t('accounting.income.payments')}</h3>
        <CustomerActives />
      </section>
    </>
  )
}
