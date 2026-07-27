import Link from 'next/link'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { CUSTOMER_LIST_GROUPS } from '@/consts/routes'
import CreateGroupForm from '@/group/components/create-form'
import api from '@/lib/i18n/api'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'

export default async function NewGroupPage({
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
            <Link href={CUSTOMER_LIST_GROUPS}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('groups.createTitle')}</h5>
        </div>
      </header>
      <CreateGroupForm />
    </>
  )
}
