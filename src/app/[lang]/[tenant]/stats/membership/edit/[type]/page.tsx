import { Button } from '@/components/ui/button'
import { type Language } from '@/lib/i18n/types'
import {
  MembershipTranslation,
  type MembershipTypes,
  MembershipTypeArray,
  MEMBERSHIP_TYPE_VIP,
} from '@/membership/consts'
import { ACCOUNTING, STATS, ACCOUNTING_TAB_MEMBERSHIP } from '@/consts/routes'
import { type TenantsType } from '@/lib/tenants'
import api from '@/lib/i18n/api'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import Link from 'next/link'
import { Label } from '@/components/ui/label'
import MembershipAmountForm from '@/membership/components/amount-form'
import { getMembershipTypes } from '@/membership/api/server'

export default async function EditMembershipPage({
  params,
}: {
  params: Promise<{
    lang: Language
    tenant: TenantsType
    type: MembershipTypes
  }>
}) {
  const { lang, tenant, type } = await params

  if (!MembershipTypeArray.includes(type)) {
    throw new Error('Tipo de membresía no válido')
  }

  if (type === MEMBERSHIP_TYPE_VIP) {
    throw new Error('No se puede editar la membresía VIP')
  }

  const { t } = await api.fetch(lang, tenant)
  const { data, error } = await getMembershipTypes(type)

  if (error || data?.length === 0) {
    return <div>Error: {error?.message}</div>
  }

  const membership = data?.[0]

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={`${STATS}${ACCOUNTING}?tab=${ACCOUNTING_TAB_MEMBERSHIP}`}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>
            {t('accounting.accountingAndFinance.title')}
          </h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-4 py-3 flex flex-col pt-12'>
        <Label className='font-light block pb-4 text-white'>{t(MembershipTranslation[type])}</Label>
        <MembershipAmountForm membership={membership} />
      </section>
    </>
  )
}
