import AssistancesList, { AssistancesListSkeleton } from '@/assistance/assistances-list'
import FooterNavigation from '@/components/nav'
import { Button } from '@/components/ui/button'
import { HOME } from '@/consts/routes'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import api from '@/lib/i18n/api'
import { Language } from '@/lib/i18n/types'
import { TenantsType } from '@/lib/tenants'

export default async function page({
  params,
}: {
  params: Promise<{ lang: Language; tenant: TenantsType }>
}) {
  const { lang, tenant } = await params
  const { t } = await api.fetch(lang, tenant)

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-2 sm:px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={HOME}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-medium text-sm'>{t('assistance.todayAssistances')}</h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-2 sm:px-4 overflow-auto py-4'>
        <Suspense fallback={<AssistancesListSkeleton collapsible={false} todayAssistancesText={t('assistance.todayAssistances')} />}>
          <AssistancesList collapsible={false} lang={lang} tenant={tenant} />
        </Suspense>
      </section>
      <FooterNavigation />
    </>
  )
}
